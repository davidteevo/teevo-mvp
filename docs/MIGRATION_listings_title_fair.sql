-- Add optional title to listings; add "Fair" to condition enum.
-- Run in Supabase SQL Editor.

ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS title TEXT;

-- Add Fair to condition check (drop existing check and add new one)
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_condition_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_condition_check
  CHECK ("condition" IN ('New', 'Excellent', 'Good', 'Used', 'Fair'));

COMMENT ON COLUMN public.listings.title IS 'Display title (e.g. Brand + Model + Loft). Optional; used in seller wizard.';
