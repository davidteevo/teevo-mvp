-- Clothing department: Men / Women / Junior
-- Run in Supabase SQL Editor if not applying via supabase db push.

ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS gender TEXT;

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_gender_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_gender_check
  CHECK (gender IS NULL OR gender IN ('Men', 'Women', 'Junior'));

COMMENT ON COLUMN public.listings.gender IS 'Clothing department: Men, Women, or Junior.';
