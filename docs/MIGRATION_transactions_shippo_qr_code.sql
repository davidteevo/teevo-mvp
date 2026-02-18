-- Run in Supabase SQL Editor.
-- Adds optional QR code URL for paperless/QR labels (when carrier supports it).

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS shippo_qr_code_url TEXT DEFAULT NULL;
