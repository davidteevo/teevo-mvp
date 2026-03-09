-- Structured golf clothing and accessories: new columns, category/condition CHECKs, model nullable.
-- Run in Supabase SQL Editor or via supabase db push.

ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS item_type TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS size TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS colour TEXT;

ALTER TABLE public.listings ALTER COLUMN model DROP NOT NULL;

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_category_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_category_check
  CHECK (category IN ('Driver', 'Woods', 'Irons', 'Wedges', 'Putter', 'Apparel', 'Bag', 'Clothing', 'Accessories'));

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_condition_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_condition_check
  CHECK ("condition" IN ('New', 'Excellent', 'Good', 'Used', 'Fair', 'New with tags', 'New without tags'));

COMMENT ON COLUMN public.listings.item_type IS 'Clothing type (e.g. Polo, Quarter Zip) or accessory type (e.g. Range Finder, Golf Bag).';
COMMENT ON COLUMN public.listings.size IS 'Size for clothing (XS–XXL or UK shoe size).';
COMMENT ON COLUMN public.listings.colour IS 'Colour for clothing; optional.';
