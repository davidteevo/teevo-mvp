-- Seller ratings & feedback (buyer → seller). Run in supabase/migrations and SQL Editor copy.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Denormalized public aggregate on users
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS rating_average NUMERIC(3,2);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.users.rating_average IS 'Mean of eligible active seller reviews (1 decimal). NULL when rating_count = 0.';
COMMENT ON COLUMN public.users.rating_count IS 'Count of eligible active seller reviews included in the public score.';

-- ---------------------------------------------------------------------------
-- seller_reviews
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.seller_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL UNIQUE REFERENCES public.transactions(id) ON DELETE RESTRICT,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE RESTRICT,
  buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  listing_title_snapshot TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'removed')),
  editable_until TIMESTAMPTZ NOT NULL,
  requires_admin_action BOOLEAN NOT NULL DEFAULT FALSE,
  moderated_at TIMESTAMPTZ,
  moderated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  moderation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_reviews_seller_status_created
  ON public.seller_reviews (seller_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_seller_reviews_buyer
  ON public.seller_reviews (buyer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_seller_reviews_requires_action
  ON public.seller_reviews (created_at DESC)
  WHERE requires_admin_action = TRUE;

CREATE INDEX IF NOT EXISTS idx_seller_reviews_listing
  ON public.seller_reviews (listing_id);

-- ---------------------------------------------------------------------------
-- seller_review_reports
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.seller_review_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES public.seller_reviews(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (reason IN (
    'abusive',
    'spam',
    'fraudulent',
    'misleading',
    'personal_information',
    'harassment',
    'not_relevant',
    'other'
  )),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (review_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_seller_review_reports_review
  ON public.seller_review_reports (review_id, status, created_at DESC);

-- ---------------------------------------------------------------------------
-- seller_review_moderation_events (audit trail)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.seller_review_moderation_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES public.seller_reviews(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('keep', 'hide', 'restore', 'remove')),
  previous_status TEXT,
  new_status TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_review_moderation_events_review
  ON public.seller_review_moderation_events (review_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Aggregate recalculation
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalc_seller_rating(p_seller_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_count integer;
  v_avg numeric;
BEGIN
  IF p_seller_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*)::integer, AVG(r.rating)
  INTO v_count, v_avg
  FROM public.seller_reviews r
  JOIN public.transactions t ON t.id = r.transaction_id
  WHERE r.seller_id = p_seller_id
    AND r.status = 'active'
    AND t.status = 'complete';

  UPDATE public.users
  SET
    rating_count = COALESCE(v_count, 0),
    rating_average = CASE
      WHEN COALESCE(v_count, 0) = 0 THEN NULL
      ELSE ROUND(v_avg::numeric, 1)
    END,
    updated_at = NOW()
  WHERE id = p_seller_id;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.trg_seller_reviews_recalc()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_seller_rating(OLD.seller_id);
    RETURN OLD;
  END IF;
  PERFORM public.recalc_seller_rating(NEW.seller_id);
  IF TG_OP = 'UPDATE' AND NEW.seller_id IS DISTINCT FROM OLD.seller_id THEN
    PERFORM public.recalc_seller_rating(OLD.seller_id);
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_seller_reviews_recalc ON public.seller_reviews;
CREATE TRIGGER trg_seller_reviews_recalc
  AFTER INSERT OR UPDATE OF rating, status, seller_id OR DELETE
  ON public.seller_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_seller_reviews_recalc();

CREATE OR REPLACE FUNCTION public.trg_transactions_recalc_seller_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.recalc_seller_rating(NEW.seller_id);
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_transactions_recalc_seller_rating ON public.transactions;
CREATE TRIGGER trg_transactions_recalc_seller_rating
  AFTER UPDATE OF status
  ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_transactions_recalc_seller_rating();

REVOKE ALL ON FUNCTION public.recalc_seller_rating(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recalc_seller_rating(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- Public profile view (aggregate only — no email/address)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.seller_public_profiles
WITH (security_invoker = false)
AS
SELECT
  id,
  display_name,
  avatar_path,
  founding_seller_rank,
  rating_average,
  rating_count
FROM public.users;

GRANT SELECT ON public.seller_public_profiles TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS — clients cannot write. Authenticated may read active review rows.
-- ---------------------------------------------------------------------------
ALTER TABLE public.seller_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_review_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_review_moderation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read active seller reviews" ON public.seller_reviews;
CREATE POLICY "Authenticated read active seller reviews"
  ON public.seller_reviews FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Reports and moderation events: no client policies. Service role only.
