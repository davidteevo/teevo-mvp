-- Run in Supabase SQL Editor to add shaft flex to listings.
-- Used for Driver/Woods (e.g. Senior, Regular, Stiff, X-Stiff, Other).

ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS shaft_flex TEXT;
