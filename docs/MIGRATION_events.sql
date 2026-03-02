-- Analytics events for seller funnel and product events.
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_name ON public.events(name);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events(created_at DESC);

COMMENT ON TABLE public.events IS 'Track events for funnel analysis (e.g. seller_signup_complete, seller_listing_published).';
