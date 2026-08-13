-- Coming Soon: pending listings are publicly visible (not purchasable).
-- Purchasability remains gated by status = 'verified' in application code.

DROP POLICY IF EXISTS "Public read verified listings" ON public.listings;
CREATE POLICY "Public read verified listings"
  ON public.listings FOR SELECT
  USING (status IN ('pending', 'verified') AND archived_at IS NULL);

DROP POLICY IF EXISTS "Read listing images" ON public.listing_images;
CREATE POLICY "Read listing images"
  ON public.listing_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_id
        AND ((l.status IN ('pending', 'verified') AND l.archived_at IS NULL) OR l.user_id = auth.uid())
    )
  );
