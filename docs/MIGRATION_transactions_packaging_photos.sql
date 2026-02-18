-- Run in Supabase SQL Editor.
-- Adds packaging photo review fields to transactions (seller uploads 3–4 photos, manual review).

-- Photo storage paths (array); status of review; notes when rejected
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS packaging_photos JSONB DEFAULT NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS packaging_status TEXT DEFAULT NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS packaging_review_notes TEXT DEFAULT NULL;

-- packaging_status: SUBMITTED (awaiting review), VERIFIED (unlocks label), REJECTED (seller can re-upload)
-- packaging_photos: array of storage paths, e.g. ["<tx_id>/0.jpg", "<tx_id>/1.jpg", ...]
-- packaging_review_notes: set when status = REJECTED
