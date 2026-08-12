-- Free Seller Starter Pack: platform toggle + per-order packaging decision.
-- Run in Supabase SQL Editor (staging first, then production).

INSERT INTO public.platform_settings (key, value)
VALUES ('free_starter_pack_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS packaging_source TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS packaging_requested_at TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS starter_pack_dispatched_at TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS starter_pack_admin_notified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_transactions_starter_pack_queue
  ON public.transactions (packaging_source, starter_pack_dispatched_at);

COMMENT ON COLUMN public.transactions.packaging_source IS
  'How packaging was obtained: SELLER_OWN | TEEVO_PAID | TEEVO_STARTER_PACK. Historical rows may be null.';
