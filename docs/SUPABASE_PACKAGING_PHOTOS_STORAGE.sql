-- Run in Supabase SQL Editor (optional). Creates bucket for packaging verification photos.
-- Uploads use signed URLs from API; bucket can be private. For admin read we use signed URLs or make bucket public.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'packaging-photos',
  'packaging-photos',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS: allow service role (API) to manage. Client uploads via signed URLs only (no direct INSERT policy needed for users).
-- If you need authenticated upload by path, add a policy that allows INSERT where folder name = transaction_id and transaction.seller_id = auth.uid().
-- For MVP, upload-urls API uses service role to create signed URLs; upload is done with that token, so no storage policy for users required.
DROP POLICY IF EXISTS "Service role full access packaging-photos" ON storage.objects;
CREATE POLICY "Service role full access packaging-photos"
ON storage.objects FOR ALL TO service_role USING (bucket_id = 'packaging-photos');
