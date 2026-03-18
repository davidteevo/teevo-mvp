-- Add additional club specs (loft/lie/length/shaft/grip) to listings.
-- Run in Supabase SQL editor.

ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS lie_angle TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS club_length TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS shaft_weight TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS shaft_material TEXT;

ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS grip_brand TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS grip_model TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS grip_size TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS grip_condition TEXT;

-- Keep values aligned with seller listing conditions and the new UI selects.
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_grip_condition_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_grip_condition_check
  CHECK (grip_condition IN ('New', 'Excellent', 'Good', 'Used', 'Fair', 'New with tags', 'New without tags'));

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_shaft_material_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_shaft_material_check
  CHECK (shaft_material IN ('Graphite', 'Steel'));

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_grip_size_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_grip_size_check
  CHECK (grip_size IN ('Standard', 'Midsize', 'Oversize'));

