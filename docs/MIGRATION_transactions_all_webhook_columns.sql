-- Run in Supabase SQL Editor if the Stripe webhook returns 500 "Insert failed" or
-- "Processing failed" with detail like "column ... does not exist".
-- This adds all transaction columns required by the checkout.session.completed webhook.
-- Safe to run multiple times (IF NOT EXISTS).

-- Stripe checkout + order state
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS buyer_postcode TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS shipping_option TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS order_state TEXT NOT NULL DEFAULT 'paid' CHECK (order_state IN ('paid', 'label_created', 'shipped', 'delivered', 'completed'));

-- Fulfilment (shipping fee, fulfilment_status)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS shipping_fee_gbp NUMERIC(5,2);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS shipping_package TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS box_fee_gbp NUMERIC(5,2);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS box_type TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS fulfilment_status TEXT;

-- Buyer address + Shippo
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS buyer_name TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS buyer_address_line1 TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS buyer_address_line2 TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS buyer_city TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS buyer_country TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS shipping_service TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS shippo_label_url TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS shippo_tracking_number TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS shippo_transaction_id TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS shippo_qr_code_url TEXT;

-- Packaging photos / review
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS packaging_photos JSONB DEFAULT NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS packaging_status TEXT DEFAULT NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS packaging_review_notes TEXT DEFAULT NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.users(id);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS review_notes TEXT;
