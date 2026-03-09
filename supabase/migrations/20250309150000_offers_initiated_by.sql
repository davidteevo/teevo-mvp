-- Distinguish buyer-initiated vs seller-initiated offers for UI (e.g. seller can propose first).
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS initiated_by TEXT NOT NULL DEFAULT 'buyer' CHECK (initiated_by IN ('buyer', 'seller'));
