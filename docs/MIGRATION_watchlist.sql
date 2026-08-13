-- Watchlist: save listings a buyer is interested in + notification tracking.
-- Run in Supabase SQL Editor if not applying supabase/migrations/.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.watchlist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  watched_price_pence INTEGER,
  last_availability_email_at TIMESTAMPTZ,
  last_now_available_email_at TIMESTAMPTZ,
  last_price_alert_at TIMESTAMPTZ,
  last_price_alert_pence INTEGER,
  last_sold_email_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_items_listing_id ON public.watchlist_items(listing_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_user_id ON public.watchlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_created_at ON public.watchlist_items(created_at);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_availability_pending
  ON public.watchlist_items(created_at)
  WHERE last_availability_email_at IS NULL;

ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own watchlist" ON public.watchlist_items;
CREATE POLICY "Users read own watchlist"
  ON public.watchlist_items FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own watchlist" ON public.watchlist_items;
CREATE POLICY "Users insert own watchlist"
  ON public.watchlist_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own watchlist" ON public.watchlist_items;
CREATE POLICY "Users delete own watchlist"
  ON public.watchlist_items FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.watchlist_items IS 'Buyer Watchlist: one row per user + listing. Notification timestamps prevent duplicate lifecycle emails.';
