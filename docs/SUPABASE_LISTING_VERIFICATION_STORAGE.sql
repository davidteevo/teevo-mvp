-- Private bucket for hosel/serial (and similar) verification photos.
-- Uploads and reads use signed URLs from the API (service role).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-verification',
  'listing-verification',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Service role full access listing-verification" ON storage.objects;
CREATE POLICY "Service role full access listing-verification"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'listing-verification')
WITH CHECK (bucket_id = 'listing-verification');
