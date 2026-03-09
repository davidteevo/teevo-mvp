-- Seller can unpublish listings (move to "Deleted" folder) and reactivate.
-- archived_at set = hidden from marketplace; null = active.

ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

COMMENT ON COLUMN public.listings.archived_at IS 'When set, listing is unpublished and shown in seller Deleted folder; hidden from public.';

-- Public may only read verified, non-archived listings
DROP POLICY IF EXISTS "Public read verified listings" ON public.listings;
CREATE POLICY "Public read verified listings"
  ON public.listings FOR SELECT
  USING (status = 'verified' AND archived_at IS NULL);

-- Listing images: public read only for verified non-archived (or own)
DROP POLICY IF EXISTS "Read listing images" ON public.listing_images;
CREATE POLICY "Read listing images"
  ON public.listing_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_id
        AND ((l.status = 'verified' AND l.archived_at IS NULL) OR l.user_id = auth.uid())
    )
  );
