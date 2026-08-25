-- Configurable Buyer Protection (Authenticity & Protection) fee.
-- Seed matches the previous hard-coded 8% + 50p. Snapshot columns are nullable
-- so historical transactions are not backfilled or reinterpreted.

INSERT INTO public.platform_settings (key, value)
VALUES
  ('buyer_fee_percentage', '8.00'),
  ('buyer_fee_fixed_pence', '50')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS buyer_fee_percentage NUMERIC(5, 2);

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS buyer_fee_fixed_pence INTEGER;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS buyer_fee_amount_pence INTEGER;
