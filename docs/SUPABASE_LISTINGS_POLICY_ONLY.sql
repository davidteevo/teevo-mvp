-- Run this in Supabase Dashboard → SQL Editor → New query
-- Your bucket already exists; this only adds the policy so uploads work.

DROP POLICY IF EXISTS "Users can upload to own listing folder" ON storage.objects;

-- Path must be: listings/{listing_id}/filename.ext where that listing belongs to the current user.
-- EXISTS avoids RLS issues when checking ownership.
CREATE POLICY "Users can upload to own listing folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'listings'
  AND EXISTS (
    SELECT 1 FROM public.listings
    WHERE id = (split_part(name, '/', 1))::uuid
    AND user_id = auth.uid()
  )
);
