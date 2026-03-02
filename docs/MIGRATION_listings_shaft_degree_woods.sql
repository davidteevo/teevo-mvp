-- Run in Supabase SQL Editor.
-- Adds shaft and degree for Driver/Woods; adds "Woods" to category.

ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS shaft TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS degree TEXT;

-- Update category CHECK to include Woods (constraint name may vary; adjust if needed)
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_category_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_category_check
  CHECK (category IN ('Driver', 'Woods', 'Irons', 'Wedges', 'Putter', 'Apparel', 'Bag'));
