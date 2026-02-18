-- Run in Supabase SQL Editor to add buyer shipping address and Shippo label fields to transactions.
-- Required for Shippo label creation (seller needs buyer's full address from checkout).

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS buyer_name TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS buyer_address_line1 TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS buyer_address_line2 TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS buyer_city TEXT;
-- buyer_postcode already exists
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS buyer_country TEXT;

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS shippo_label_url TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS shippo_tracking_number TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS shippo_transaction_id TEXT;

-- Shipping service selected at checkout (DPD_NEXT_DAY or DPD_SHIP_TO_SHOP). Used when buying Shippo label.
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS shipping_service TEXT;
