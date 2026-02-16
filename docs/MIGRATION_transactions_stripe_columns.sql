-- Run this in Supabase SQL Editor if your transactions table already existed
-- before adding Stripe checkout/create and order state.
-- Adds: buyer_postcode, shipping_option, stripe_checkout_session_id, order_state

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS buyer_postcode TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS shipping_option TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS order_state TEXT NOT NULL DEFAULT 'paid' CHECK (order_state IN ('paid', 'label_created', 'shipped', 'delivered', 'completed'));
