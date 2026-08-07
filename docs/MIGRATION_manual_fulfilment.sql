-- Manual fulfilment mode: provider-agnostic tracking + platform setting.
-- Run in Supabase SQL Editor (staging first, then production).

-- Snapshot fulfilment provider on each order (shippo | manual)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS fulfilment_mode TEXT NOT NULL DEFAULT 'shippo';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS courier TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS tracking_url TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS shipping_label_url TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS shipment_id TEXT;

-- Global platform settings (key/value)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.platform_settings (key, value)
VALUES ('fulfilment_mode', 'shippo')
ON CONFLICT (key) DO NOTHING;

-- Storage bucket for manual shipping label PDFs (create via Dashboard if this fails)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('shipping-labels', 'shipping-labels', false, 10485760, ARRAY['application/pdf']::text[])
ON CONFLICT (id) DO NOTHING;
