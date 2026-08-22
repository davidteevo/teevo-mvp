-- Guided listing photography: structured metadata, serial privacy, verification bucket.

ALTER TABLE public.listing_images
  ADD COLUMN IF NOT EXISTS image_type TEXT,
  ADD COLUMN IF NOT EXISTS visibility TEXT,
  ADD COLUMN IF NOT EXISTS is_required BOOLEAN,
  ADD COLUMN IF NOT EXISTS club_identifier TEXT,
  ADD COLUMN IF NOT EXISTS slot_key TEXT,
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT NOT NULL DEFAULT 'listings';

ALTER TABLE public.listing_images DROP CONSTRAINT IF EXISTS listing_images_image_type_check;
ALTER TABLE public.listing_images
  ADD CONSTRAINT listing_images_image_type_check
  CHECK (
    image_type IS NULL OR image_type IN (
      'hero',
      'face',
      'sole',
      'crown',
      'back',
      'hosel_serial',
      'shaft',
      'grip',
      'set_overview',
      'wedge_specs',
      'putter_address',
      'putter_rear',
      'putter_neck',
      'extra',
      'legacy'
    )
  );

ALTER TABLE public.listing_images DROP CONSTRAINT IF EXISTS listing_images_visibility_check;
ALTER TABLE public.listing_images
  ADD CONSTRAINT listing_images_visibility_check
  CHECK (visibility IS NULL OR visibility IN ('public', 'verification_only'));

UPDATE public.listing_images
SET image_type = COALESCE(image_type, 'legacy'),
    visibility = COALESCE(visibility, 'public')
WHERE image_type IS NULL OR visibility IS NULL;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS hosel_serial_status TEXT;

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_hosel_serial_status_check;
ALTER TABLE public.listings
  ADD CONSTRAINT listings_hosel_serial_status_check
  CHECK (
    hosel_serial_status IS NULL OR hosel_serial_status IN (
      'uploaded',
      'not_found',
      'not_applicable'
    )
  );

DROP POLICY IF EXISTS "Read listing images" ON public.listing_images;
CREATE POLICY "Read listing images"
  ON public.listing_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_id
        AND (
          l.user_id = auth.uid()
          OR (
            l.status IN ('pending', 'verified')
            AND l.archived_at IS NULL
            AND visibility IS DISTINCT FROM 'verification_only'
          )
        )
    )
  );

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
