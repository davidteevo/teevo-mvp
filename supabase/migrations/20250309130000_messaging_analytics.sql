-- Optional analytics for messaging KPIs: listings with messages, conversations with offers, offers accepted, etc.
CREATE TABLE IF NOT EXISTS public.messaging_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  reference_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messaging_analytics_event_type ON public.messaging_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_messaging_analytics_created_at ON public.messaging_analytics(created_at DESC);

-- No RLS: only server/service role writes; analytics can be read by admin or backend.
