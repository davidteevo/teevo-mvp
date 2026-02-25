-- Add first name and surname to users (for Stripe, emails, shipping labels).
-- Run in Supabase SQL Editor.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS surname TEXT;
