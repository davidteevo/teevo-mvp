-- Founding Members campaign: evolve founding_seller_rank into signup-allocated Founders,
-- £5 credit on first verified listing, campaign status, atomic allocation RPC.

-- ---------------------------------------------------------------------------
-- users: founder reward / join metadata
-- ---------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS founder_joined_at TIMESTAMPTZ NULL;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS founder_reward_status TEXT NOT NULL DEFAULT 'none';

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_founder_reward_status_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_founder_reward_status_check
    CHECK (founder_reward_status IN ('none', 'eligible', 'earned'));

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS founder_reward_earned_at TIMESTAMPTZ NULL;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS founder_reward_listing_id UUID NULL REFERENCES public.listings(id) ON DELETE SET NULL;

-- Unique founder numbers (immutable; never reuse)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_users_founding_seller_rank
  ON public.users (founding_seller_rank)
  WHERE founding_seller_rank IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_founding_seller_rank
  ON public.users (founding_seller_rank)
  WHERE founding_seller_rank IS NOT NULL;

-- ---------------------------------------------------------------------------
-- credit_transactions: founder_listing_reward type
-- ---------------------------------------------------------------------------
ALTER TABLE public.credit_transactions
  DROP CONSTRAINT IF EXISTS credit_transactions_type_check;

ALTER TABLE public.credit_transactions
  ADD CONSTRAINT credit_transactions_type_check
  CHECK (type IN (
    'referral_buyer_reward',
    'seller_listing_referral',
    'seller_sale_referral',
    'admin_adjustment',
    'redemption',
    'reversal',
    'founder_listing_reward'
  ));

-- One founder listing reward per user
CREATE UNIQUE INDEX IF NOT EXISTS uniq_credit_founder_listing_reward_user
  ON public.credit_transactions (user_id)
  WHERE type = 'founder_listing_reward';

-- ---------------------------------------------------------------------------
-- platform_settings: campaign control
-- ---------------------------------------------------------------------------
INSERT INTO public.platform_settings (key, value)
VALUES
  ('founder_campaign_status', 'active'),
  ('founder_campaign_limit', '100')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Atomic allocation RPC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.allocate_founding_member(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_limit INT;
  v_existing INT;
  v_role TEXT;
  v_created_by_admin BOOLEAN;
  v_next INT;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Serialize allocations
  PERFORM pg_advisory_xact_lock(87201420);

  SELECT COALESCE(
    (SELECT value FROM platform_settings WHERE key = 'founder_campaign_status'),
    'active'
  ) INTO v_status;

  IF v_status IS DISTINCT FROM 'active' THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(
    NULLIF((SELECT value FROM platform_settings WHERE key = 'founder_campaign_limit'), '')::INT,
    100
  ) INTO v_limit;

  IF v_limit IS NULL OR v_limit < 1 THEN
    v_limit := 100;
  END IF;
  -- Cap identity of first 100 — never allocate beyond 100 even if setting is tampered
  IF v_limit > 100 THEN
    v_limit := 100;
  END IF;

  SELECT founding_seller_rank, role, COALESCE(created_by_admin, FALSE)
  INTO v_existing, v_role, v_created_by_admin
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  IF v_role = 'admin' OR v_created_by_admin IS TRUE THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(MAX(founding_seller_rank), 0) + 1
  INTO v_next
  FROM users
  WHERE founding_seller_rank IS NOT NULL;

  IF v_next > v_limit THEN
    UPDATE platform_settings
    SET value = 'complete', updated_at = NOW()
    WHERE key = 'founder_campaign_status'
      AND value IS DISTINCT FROM 'complete';
    RETURN NULL;
  END IF;

  UPDATE users
  SET
    founding_seller_rank = v_next,
    founder_joined_at = COALESCE(founder_joined_at, NOW()),
    founder_reward_status = CASE
      WHEN founder_reward_status = 'earned' THEN 'earned'
      ELSE 'eligible'
    END,
    updated_at = NOW()
  WHERE id = p_user_id
    AND founding_seller_rank IS NULL;

  IF NOT FOUND THEN
    -- Concurrent path already assigned
    SELECT founding_seller_rank INTO v_existing FROM users WHERE id = p_user_id;
    RETURN v_existing;
  END IF;

  IF v_next >= v_limit THEN
    UPDATE platform_settings
    SET value = 'complete', updated_at = NOW()
    WHERE key = 'founder_campaign_status';
  END IF;

  RETURN v_next;
END;
$$;

REVOKE ALL ON FUNCTION public.allocate_founding_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.allocate_founding_member(UUID) TO service_role;

-- Drop listing-order rank helper (allocation is now signup-based)
DROP FUNCTION IF EXISTS public.get_founding_seller_rank(UUID);

-- ---------------------------------------------------------------------------
-- Backfill: renumber organic users by signup order (created_at, id)
-- ---------------------------------------------------------------------------
-- Clear ranks so we can reassign uniquely by created_at
UPDATE public.users
SET
  founding_seller_rank = NULL,
  founder_joined_at = NULL,
  founder_reward_status = 'none',
  founder_reward_earned_at = NULL,
  founder_reward_listing_id = NULL,
  updated_at = NOW()
WHERE founding_seller_rank IS NOT NULL
   OR founder_reward_status IS DISTINCT FROM 'none';

WITH eligible AS (
  SELECT
    id,
    created_at,
    ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
  FROM public.users
  WHERE role IS DISTINCT FROM 'admin'
    AND COALESCE(created_by_admin, FALSE) IS NOT TRUE
),
capped AS (
  SELECT id, created_at, rn
  FROM eligible
  WHERE rn <= 100
)
UPDATE public.users u
SET
  founding_seller_rank = c.rn,
  founder_joined_at = c.created_at,
  founder_reward_status = 'eligible',
  updated_at = NOW()
FROM capped c
WHERE u.id = c.id;

-- Mark campaign complete if already at capacity after backfill
UPDATE public.platform_settings
SET value = 'complete', updated_at = NOW()
WHERE key = 'founder_campaign_status'
  AND (
    SELECT COUNT(*) FROM public.users WHERE founding_seller_rank IS NOT NULL
  ) >= 100;

-- ---------------------------------------------------------------------------
-- Reward backfill: Founders with a verified non-on-behalf listing earn £5 once
-- ---------------------------------------------------------------------------
WITH first_verified AS (
  SELECT DISTINCT ON (l.user_id)
    l.user_id,
    l.id AS listing_id,
    l.updated_at AS verified_at
  FROM public.listings l
  INNER JOIN public.users u ON u.id = l.user_id
  WHERE u.founding_seller_rank IS NOT NULL
    AND u.founder_reward_status = 'eligible'
    AND l.status = 'verified'
    AND COALESCE(l.created_on_behalf, FALSE) IS NOT TRUE
    AND l.archived_at IS NULL
  ORDER BY l.user_id, l.created_at ASC, l.id ASC
),
inserted_credit AS (
  INSERT INTO public.credit_transactions (
    user_id,
    amount_pence,
    type,
    status,
    admin_notes,
    approved_at,
    created_at,
    updated_at
  )
  SELECT
    fv.user_id,
    500,
    'founder_listing_reward',
    'available',
    'Founder first-listing reward (backfill)',
    NOW(),
    NOW(),
    NOW()
  FROM first_verified fv
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.credit_transactions ct
    WHERE ct.user_id = fv.user_id
      AND ct.type = 'founder_listing_reward'
  )
  RETURNING user_id
)
UPDATE public.users u
SET
  founder_reward_status = 'earned',
  founder_reward_earned_at = COALESCE(u.founder_reward_earned_at, NOW()),
  founder_reward_listing_id = fv.listing_id,
  updated_at = NOW()
FROM first_verified fv
WHERE u.id = fv.user_id
  AND u.founder_reward_status = 'eligible';
