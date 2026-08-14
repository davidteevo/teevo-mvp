-- Seller dispatch deadline, extensions, automatic cancellation, and listing availability confirmation.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Configurable durations (business days).
INSERT INTO public.platform_settings (key, value)
VALUES
  ('dispatch_deadline_business_days', '5'),
  ('dispatch_extension_business_days', '3'),
  ('dispatch_max_extensions', '1')
ON CONFLICT (key) DO NOTHING;

-- Allow cancelled fulfilment state on order_state.
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_order_state_check;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_order_state_check
  CHECK (order_state IN ('paid', 'label_created', 'shipped', 'delivered', 'completed', 'cancelled'));

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS original_dispatch_deadline_at TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS dispatch_deadline_at TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS dispatch_clock_paused_at TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS dispatch_clock_pause_reason TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS dispatch_extension_status TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS dispatch_extension_requested_at TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS dispatch_extension_responded_at TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS dispatch_extension_responded_by UUID REFERENCES public.users(id);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS dispatch_extension_business_days INTEGER;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS dispatch_reminder_after_purchase_sent_at TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS dispatch_reminder_one_day_sent_at TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS dispatch_reminder_final_sent_at TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS cancellation_status TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_dispatch_clock_pause_reason_check'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_dispatch_clock_pause_reason_check
      CHECK (dispatch_clock_pause_reason IS NULL OR dispatch_clock_pause_reason IN ('starter_pack', 'packaging_review', 'manual_label'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_dispatch_extension_status_check'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_dispatch_extension_status_check
      CHECK (dispatch_extension_status IS NULL OR dispatch_extension_status IN ('requested', 'approved', 'declined', 'superseded'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_cancellation_reason_check'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_cancellation_reason_check
      CHECK (cancellation_reason IS NULL OR cancellation_reason IN ('seller_dispatch_timeout', 'admin_override'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_cancellation_status_check'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_cancellation_status_check
      CHECK (cancellation_status IS NULL OR cancellation_status IN ('in_progress', 'completed', 'failed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_pending_dispatch_deadline
  ON public.transactions (dispatch_deadline_at)
  WHERE status = 'pending' AND shipped_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_open_dispatch_extension
  ON public.transactions (dispatch_extension_status)
  WHERE dispatch_extension_status = 'requested';

ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS availability_confirmation_status TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'listings_availability_confirmation_status_check'
  ) THEN
    ALTER TABLE public.listings
      ADD CONSTRAINT listings_availability_confirmation_status_check
      CHECK (
        availability_confirmation_status IS NULL
        OR availability_confirmation_status IN ('required', 'confirmed_available', 'confirmed_unavailable')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_listings_availability_confirmation_required
  ON public.listings (availability_confirmation_status)
  WHERE availability_confirmation_status = 'required';

CREATE TABLE IF NOT EXISTS public.transaction_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_id UUID REFERENCES public.users(id),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transaction_events_transaction_id
  ON public.transaction_events (transaction_id, created_at DESC);

ALTER TABLE public.transaction_events ENABLE ROW LEVEL SECURITY;
