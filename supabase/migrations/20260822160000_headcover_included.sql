-- Headcover included for woods, hybrids, and putters.

ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS headcover_included BOOLEAN;
