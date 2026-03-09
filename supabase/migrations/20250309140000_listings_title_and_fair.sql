-- Add optional title to listings; add "Fair" to condition check.
-- Fixes PGRST204: Could not find the 'title' column of 'listings' in the schema cache.

ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS title TEXT;

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_condition_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_condition_check
  CHECK ("condition" IN ('New', 'Excellent', 'Good', 'Used', 'Fair'));

COMMENT ON COLUMN public.listings.title IS 'Display title (e.g. Brand + Model + Loft). Optional; used in seller wizard.';
