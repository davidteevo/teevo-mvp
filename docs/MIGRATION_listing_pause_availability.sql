-- Admin listing pause + seller availability reconfirmation.
-- Apply in the Supabase SQL Editor (staging, then production).
-- Does not change listings.status; purchasability is gated in application code.

CREATE TABLE IF NOT EXISTS public.listing_availability_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  requested_by_admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email_sent_at TIMESTAMPTZ,
  email_error TEXT,
  reminder_sent_at TIMESTAMPTZ,
  reminder_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_listing_availability_batches_seller
  ON public.listing_availability_batches (seller_id, created_at DESC);

ALTER TABLE public.listing_availability_batches ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS buying_paused BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS availability_confirmation_source TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS availability_confirmation_requested_at TIMESTAMPTZ;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS availability_confirmed_at TIMESTAMPTZ;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS availability_confirmation_reminder_sent_at TIMESTAMPTZ;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS availability_confirmation_batch_id UUID
  REFERENCES public.listing_availability_batches(id) ON DELETE SET NULL;

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_availability_confirmation_status_check;
ALTER TABLE public.listings
  ADD CONSTRAINT listings_availability_confirmation_status_check
  CHECK (
    availability_confirmation_status IS NULL
    OR availability_confirmation_status IN (
      'required',
      'confirmed_available',
      'confirmed_unavailable',
      'expired'
    )
  );

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_availability_confirmation_source_check;
ALTER TABLE public.listings
  ADD CONSTRAINT listings_availability_confirmation_source_check
  CHECK (
    availability_confirmation_source IS NULL
    OR availability_confirmation_source IN (
      'dispatch_timeout',
      'admin_reconfirm',
      'stale_listing'
    )
  );

CREATE INDEX IF NOT EXISTS idx_listings_buying_paused
  ON public.listings (buying_paused)
  WHERE buying_paused = TRUE;

CREATE INDEX IF NOT EXISTS idx_listings_availability_confirmation_required
  ON public.listings (availability_confirmation_status)
  WHERE availability_confirmation_status = 'required';

CREATE INDEX IF NOT EXISTS idx_listings_availability_confirmation_batch
  ON public.listings (availability_confirmation_batch_id)
  WHERE availability_confirmation_batch_id IS NOT NULL;

INSERT INTO public.platform_settings (key, value)
VALUES
  ('availability_reminder_days', '2'),
  ('availability_expire_days', '7')
ON CONFLICT (key) DO NOTHING;
