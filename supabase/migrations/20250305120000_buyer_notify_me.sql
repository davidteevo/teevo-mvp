-- Notify-me signups: capture buyer demand when buying is disabled (pre-shipping phase)
CREATE TABLE IF NOT EXISTS public.buyer_notify_me (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buyer_notify_me_listing_id ON public.buyer_notify_me(listing_id);
CREATE INDEX IF NOT EXISTS idx_buyer_notify_me_created_at ON public.buyer_notify_me(created_at DESC);

ALTER TABLE public.buyer_notify_me ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (anon or authenticated) so we can capture demand before login
CREATE POLICY "Allow insert notify_me"
  ON public.buyer_notify_me FOR INSERT
  WITH CHECK (true);

-- No public read; admin/export can use service role
CREATE POLICY "No public read notify_me"
  ON public.buyer_notify_me FOR SELECT
  USING (false);
