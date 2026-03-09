-- Merge Apparel into Clothing: migrate existing rows, then remove Apparel from category CHECK.

UPDATE public.listings SET category = 'Clothing' WHERE category = 'Apparel';

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_category_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_category_check
  CHECK (category IN ('Driver', 'Woods', 'Irons', 'Wedges', 'Putter', 'Bag', 'Clothing', 'Accessories'));
