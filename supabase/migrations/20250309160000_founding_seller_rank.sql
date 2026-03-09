-- First 100 Founding Seller badge: rank (1-100) for users who list an item, ordered by earliest listing.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS founding_seller_rank INT NULL;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_founding_seller_rank_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_founding_seller_rank_check
  CHECK (founding_seller_rank IS NULL OR (founding_seller_rank >= 1 AND founding_seller_rank <= 100));

-- Backfill: set founding_seller_rank for existing users who are in the first 100 by earliest listing.
WITH first_listing AS (
  SELECT user_id, MIN(created_at) AS first_at
  FROM public.listings
  GROUP BY user_id
),
ordered AS (
  SELECT user_id, ROW_NUMBER() OVER (ORDER BY first_at, user_id) AS rn
  FROM first_listing
)
UPDATE public.users u
SET founding_seller_rank = o.rn, updated_at = NOW()
FROM ordered o
WHERE u.id = o.user_id
  AND o.rn <= 100
  AND (u.founding_seller_rank IS NULL OR u.founding_seller_rank > o.rn);

-- Function for API: return founding seller rank (1–100) for a user by first listing time, or null if not in first 100.
CREATE OR REPLACE FUNCTION public.get_founding_seller_rank(p_user_id UUID)
RETURNS TABLE(get_founding_seller_rank INT) AS $$
  WITH first_listing AS (
    SELECT user_id, MIN(created_at) AS first_at FROM public.listings GROUP BY user_id
  ),
  ordered AS (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY first_at, user_id)::INT AS rn FROM first_listing
  )
  SELECT (SELECT rn FROM ordered WHERE user_id = p_user_id) AS get_founding_seller_rank;
$$ LANGUAGE sql STABLE;
