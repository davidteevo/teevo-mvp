-- Run this entire script in Supabase Dashboard → SQL Editor → New query
-- Fixes: "Image upload failed" when listing an item (bucket or policy missing).

-- 1. Create the bucket if it doesn't exist (Public so listing images can be viewed).
--    If this fails with "permission denied", create the bucket manually: Storage → New bucket → name "listings", set Public ON.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listings',
  'listings',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Remove old policy if it exists (so we can re-run this script)
DROP POLICY IF EXISTS "Users can upload to own listing folder" ON storage.objects;

-- 3. Allow authenticated users to upload only into their own listing folder
--    Path must be: listings/{listing_id}/something.jpg where listing.user_id = current user
CREATE POLICY "Users can upload to own listing folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'listings'
  AND (SELECT user_id FROM public.listings WHERE id = ((storage.foldername(name))[1])::uuid) = auth.uid()
);

-- 4. Allow public read so listing images can be displayed (if bucket is public this may already work)
DROP POLICY IF EXISTS "Public read listings" ON storage.objects;
CREATE POLICY "Public read listings"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'listings');
