-- Run in Supabase SQL Editor.
-- Adds review audit fields: who approved/rejected and when; notes from admin.

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.users(id);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- reviewed_by: user id of admin who verified or rejected
-- reviewed_at: when the review was done
-- review_notes: admin notes (e.g. reason for rejection); set on reject, cleared on verify
