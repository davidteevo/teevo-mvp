-- Mirror of supabase/migrations/20260910150000_founding_members_include_admin_created.sql
-- Allow admin-created users (incl. creators) to receive Founding Member numbers
-- when campaign spots remain. Backfill existing creators into remaining spots.

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
  v_next INT;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

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
  IF v_limit > 100 THEN
    v_limit := 100;
  END IF;

  SELECT founding_seller_rank, role
  INTO v_existing, v_role
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  IF v_role = 'admin' THEN
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

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.user_id
    FROM public.creators c
    INNER JOIN public.users u ON u.id = c.user_id
    WHERE c.user_id IS NOT NULL
      AND u.founding_seller_rank IS NULL
      AND u.role IS DISTINCT FROM 'admin'
    ORDER BY c.created_at ASC, c.id ASC
  LOOP
    PERFORM public.allocate_founding_member(r.user_id);
  END LOOP;
END;
$$;
