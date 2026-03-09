-- Add Driving Irons and Hybrids to allowed listing categories.

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_category_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_category_check
  CHECK (category IN ('Driver', 'Woods', 'Driving Irons', 'Hybrids', 'Irons', 'Wedges', 'Putter', 'Bag', 'Clothing', 'Accessories'));
