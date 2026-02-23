-- Idempotent email tracking: avoid sending the same automated email twice (e.g. on webhook retry).
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.sent_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_type TEXT NOT NULL,
  reference_type TEXT NOT NULL DEFAULT 'transaction',
  reference_id TEXT NOT NULL,
  recipient_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(email_type, reference_id)
);

CREATE INDEX IF NOT EXISTS idx_sent_emails_reference ON public.sent_emails(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_sent_emails_sent_at ON public.sent_emails(sent_at DESC);

COMMENT ON TABLE public.sent_emails IS 'Tracks automated emails sent per event for idempotency (e.g. order_confirmation + transaction_id).';
