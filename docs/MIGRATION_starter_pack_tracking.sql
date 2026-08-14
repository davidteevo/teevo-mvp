-- Starter Pack inbound tracking (box shipped to the seller).
-- Run in Supabase SQL Editor (staging first, then production).
-- Separate from club-to-buyer courier / tracking_number / tracking_url.

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS starter_pack_courier TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS starter_pack_tracking_number TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS starter_pack_tracking_url TEXT;

COMMENT ON COLUMN public.transactions.starter_pack_courier IS
  'Courier used to ship the free Starter Pack box to the seller.';
COMMENT ON COLUMN public.transactions.starter_pack_tracking_number IS
  'Tracking number for the Starter Pack box sent to the seller.';
COMMENT ON COLUMN public.transactions.starter_pack_tracking_url IS
  'Public tracking URL for the Starter Pack box sent to the seller.';
