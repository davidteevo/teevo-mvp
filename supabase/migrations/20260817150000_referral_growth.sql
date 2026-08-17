-- Referral & Creator Growth System: attribution, rewards, credit ledger, creators.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Transactions: Teevo-funded incentives applied at checkout (does not change seller proceeds)
-- ---------------------------------------------------------------------------
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS referral_discount_pence INTEGER NOT NULL DEFAULT 0 CHECK (referral_discount_pence >= 0);
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS credit_redeemed_pence INTEGER NOT NULL DEFAULT 0 CHECK (credit_redeemed_pence >= 0);
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS referral_id UUID;

COMMENT ON COLUMN public.transactions.referral_discount_pence IS 'Teevo-funded first-purchase referral discount in pence.';
COMMENT ON COLUMN public.transactions.credit_redeemed_pence IS 'Teevo credit applied at checkout in pence.';

-- ---------------------------------------------------------------------------
-- referral_codes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL,
  owner_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('user', 'creator')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT referral_codes_code_upper CHECK (code = upper(code))
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_referral_codes_code ON public.referral_codes (code);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_referral_codes_active_user
  ON public.referral_codes (owner_user_id)
  WHERE kind = 'user' AND status = 'active' AND owner_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_referral_codes_owner ON public.referral_codes (owner_user_id);

-- ---------------------------------------------------------------------------
-- creators
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.creators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  social_handle TEXT,
  social_url TEXT,
  referral_code_id UUID NOT NULL REFERENCES public.referral_codes(id) ON DELETE RESTRICT,
  commission_pence INTEGER NOT NULL CHECK (commission_pence >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'disabled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_creators_referral_code ON public.creators (referral_code_id);
CREATE INDEX IF NOT EXISTS idx_creators_user ON public.creators (user_id);
CREATE INDEX IF NOT EXISTS idx_creators_status ON public.creators (status);

-- ---------------------------------------------------------------------------
-- referrals (one original acquisition referrer per user)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  referred_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referral_code_id UUID REFERENCES public.referral_codes(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES public.creators(id) ON DELETE SET NULL,
  source TEXT NOT NULL CHECK (source IN ('url', 'code', 'creator_url', 'creator_code')),
  attributed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT referrals_no_self CHECK (referrer_user_id <> referred_user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_referrals_referred_user ON public.referrals (referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals (referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_creator ON public.referrals (creator_id);
CREATE INDEX IF NOT EXISTS idx_referrals_created ON public.referrals (created_at DESC);

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_referral_id_fkey;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_referral_id_fkey
  FOREIGN KEY (referral_id) REFERENCES public.referrals(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- referral_visits (anonymous click counts; one per code+visitor+day)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referral_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_code_id UUID NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,
  visitor_key TEXT NOT NULL,
  landing_path TEXT,
  visit_on DATE NOT NULL DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'utc')::date),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (referral_code_id, visitor_key, visit_on)
);

CREATE INDEX IF NOT EXISTS idx_referral_visits_code_created ON public.referral_visits (referral_code_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- referral_rewards
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE RESTRICT,
  reward_type TEXT NOT NULL CHECK (reward_type IN (
    'buyer_referrer_credit',
    'seller_listing_credit',
    'seller_sale_credit',
    'creator_commission'
  )),
  amount_pence INTEGER NOT NULL CHECK (amount_pence >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'paid', 'cancelled', 'reversed'
  )),
  related_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  related_listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  credit_transaction_id UUID,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_referral_rewards_type
  ON public.referral_rewards (referral_id, reward_type);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_referral_rewards_tx_type
  ON public.referral_rewards (related_transaction_id, reward_type)
  WHERE related_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_referral_rewards_status ON public.referral_rewards (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referral ON public.referral_rewards (referral_id);

-- ---------------------------------------------------------------------------
-- credit_transactions (ledger; balance is derived, never a mutable users column)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  amount_pence INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'referral_buyer_reward',
    'seller_listing_referral',
    'seller_sale_referral',
    'admin_adjustment',
    'redemption',
    'reversal'
  )),
  status TEXT NOT NULL CHECK (status IN (
    'pending', 'available', 'redeemed', 'reversed', 'cancelled'
  )),
  referral_reward_id UUID REFERENCES public.referral_rewards(id) ON DELETE SET NULL,
  related_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_status
  ON public.credit_transactions (user_id, status);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_reward
  ON public.credit_transactions (referral_reward_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_credit_redemption_tx
  ON public.credit_transactions (related_transaction_id)
  WHERE type = 'redemption' AND related_transaction_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_credit_issue_reward
  ON public.credit_transactions (referral_reward_id)
  WHERE type IN ('referral_buyer_reward', 'seller_listing_referral', 'seller_sale_referral')
    AND referral_reward_id IS NOT NULL;

ALTER TABLE public.referral_rewards
  DROP CONSTRAINT IF EXISTS referral_rewards_credit_transaction_id_fkey;
ALTER TABLE public.referral_rewards
  ADD CONSTRAINT referral_rewards_credit_transaction_id_fkey
  FOREIGN KEY (credit_transaction_id) REFERENCES public.credit_transactions(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Platform settings (future rewards only; do not rewrite history)
-- ---------------------------------------------------------------------------
INSERT INTO public.platform_settings (key, value)
VALUES
  ('referral_programme_enabled', 'true'),
  ('referral_discount_pence', '500'),
  ('referrer_reward_pence', '500'),
  ('referral_min_item_pence', '5000'),
  ('seller_referral_enabled', 'true'),
  ('seller_listing_reward_pence', '500'),
  ('seller_sale_reward_pence', '500'),
  ('creator_programme_enabled', 'true'),
  ('creator_default_commission_pence', '750'),
  ('credit_enabled', 'true'),
  ('credit_expiry_days', '')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- RLS — clients may read own codes and own credit ledger. Writes via service role.
-- ---------------------------------------------------------------------------
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own referral codes" ON public.referral_codes;
CREATE POLICY "Users read own referral codes"
  ON public.referral_codes FOR SELECT
  TO authenticated
  USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Users read own credit transactions" ON public.credit_transactions;
CREATE POLICY "Users read own credit transactions"
  ON public.credit_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
