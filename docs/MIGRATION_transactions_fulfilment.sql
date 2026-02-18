-- Run in Supabase SQL Editor.
-- Adds fulfilment and packaging fields to transactions (buyer delivery choice + seller packaging choice).

-- Buyer delivery (already have shipping_service in previous migration)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS shipping_fee_gbp NUMERIC(5,2);

-- Seller packaging choice
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS shipping_package TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS box_fee_gbp NUMERIC(5,2);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS box_type TEXT;

-- Fulfilment pipeline: PAID → PACKAGING_SUBMITTED → PACKAGING_VERIFIED → LABEL_CREATED → SHIPPED → DELIVERED → COMPLETED
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS fulfilment_status TEXT;

-- Optional: backfill existing shipped orders so fulfilment_status is set
-- UPDATE public.transactions SET fulfilment_status = 'SHIPPED' WHERE status = 'shipped' AND fulfilment_status IS NULL;
