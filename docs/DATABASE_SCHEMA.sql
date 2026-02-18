-- Teevo MVP – PostgreSQL schema (Supabase)
-- Run in Supabase SQL Editor

-- Enable UUID extension if not already
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users (extends Supabase auth; id matches auth.users.id)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'buyer' CHECK ("role" IN ('buyer', 'seller', 'admin')),
  stripe_account_id TEXT,
  avatar_path TEXT,
  display_name TEXT,
  location TEXT,
  handicap INT CHECK (handicap IS NULL OR (handicap >= 0 AND handicap <= 54)),
  handed TEXT CHECK (handed IS NULL OR handed IN ('left', 'right')),
  address_line1 TEXT,
  address_line2 TEXT,
  address_city TEXT,
  address_postcode TEXT,
  address_country TEXT,
  date_of_birth DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Listings
CREATE TABLE IF NOT EXISTS public.listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('Driver', 'Irons', 'Wedges', 'Putter', 'Apparel', 'Bag')),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  "condition" TEXT NOT NULL CHECK ("condition" IN ('New', 'Excellent', 'Good', 'Used')),
  description TEXT,
  price INTEGER NOT NULL CHECK (price > 0), -- pence
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'sold')),
  flagged BOOLEAN NOT NULL DEFAULT FALSE,
  admin_feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON public.listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_category ON public.listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON public.listings(created_at DESC);

-- Listing images (3–6 per listing)
CREATE TABLE IF NOT EXISTS public.listing_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_images_listing_id ON public.listing_images(listing_id);

-- Transactions (order state: paid → label_created → shipped → delivered → completed; release window then payout)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES public.listings(id),
  buyer_id UUID NOT NULL REFERENCES public.users(id),
  seller_id UUID NOT NULL REFERENCES public.users(id),
  stripe_payment_id TEXT,
  stripe_checkout_session_id TEXT,
  stripe_transfer_id TEXT,
  amount INTEGER NOT NULL, -- pence (total charged)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'shipped', 'complete', 'refunded', 'dispute')),
  order_state TEXT NOT NULL DEFAULT 'paid' CHECK (order_state IN ('paid', 'label_created', 'shipped', 'delivered', 'completed')),
  buyer_postcode TEXT,
  shipping_option TEXT,
  shipped_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON public.transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_seller ON public.transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_transactions_listing ON public.transactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);

-- Admin intervention log (optional)
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES public.users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS policies (simplified; adjust to your auth)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Public can read verified listings only
CREATE POLICY "Public read verified listings"
  ON public.listings FOR SELECT
  USING (status = 'verified');

-- Users read own listings
CREATE POLICY "Users read own listings"
  ON public.listings FOR SELECT
  USING (auth.uid() = user_id);

-- Users insert own listings
CREATE POLICY "Users create own listings"
  ON public.listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users update own pending listings
CREATE POLICY "Users update own pending listings"
  ON public.listings FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- Listing images: read if listing is verified or own
CREATE POLICY "Read listing images"
  ON public.listing_images FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND (l.status = 'verified' OR l.user_id = auth.uid()))
  );

CREATE POLICY "Insert listing images for own listing"
  ON public.listing_images FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

-- Users table: read/update own row
CREATE POLICY "Users read own"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users update own"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Transactions: buyer/seller can read own
CREATE POLICY "Users read own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Service role or API will handle admin and inserts for transactions (e.g. from webhook)
-- For full RLS you would add admin policies and allow service role for webhooks.

-- Trigger: update listing to sold when transaction created
CREATE OR REPLACE FUNCTION set_listing_sold()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.listings SET status = 'sold', updated_at = NOW() WHERE id = NEW.listing_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_transaction_created
  AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION set_listing_sold();

-- Trigger: sync users from auth (optional; or use Supabase Auth hook)
-- If using Supabase Auth, you may create user row on signup via trigger or API.

-- Migration: add admin_feedback to existing listings table (run if table already existed)
-- ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS admin_feedback TEXT;

-- Migration: add profile fields to users (run if table already existed)
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_path TEXT;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS display_name TEXT;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS location TEXT;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS handicap INT;
-- ALTER TABLE public.users ADD CONSTRAINT users_handicap_range CHECK (handicap IS NULL OR (handicap >= 0 AND handicap <= 54));
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS handed TEXT;
-- ALTER TABLE public.users ADD CONSTRAINT users_handed_check CHECK (handed IS NULL OR handed IN ('left', 'right'));
--
-- Migration: address and DOB for profile / Stripe prefill
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address_line1 TEXT;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address_line2 TEXT;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address_city TEXT;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address_postcode TEXT;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address_country TEXT;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Migration: Stripe checkout + order state (run if transactions already existed)
-- ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS buyer_postcode TEXT;
-- ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS shipping_option TEXT;
-- ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;
-- ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS order_state TEXT NOT NULL DEFAULT 'paid' CHECK (order_state IN ('paid', 'label_created', 'shipped', 'delivered', 'completed'));
