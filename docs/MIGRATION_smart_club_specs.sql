-- Smart club specs: category-aware listing fields, set composition, provenance, listing_clubs.
-- Prefer applying via supabase/migrations/20260821150000_smart_club_specs.sql.

ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS standard_spec_status TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS customised_aspects TEXT[];
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS customised_other_note TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS listing_format TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS iron_number TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS set_composition TEXT[];
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS bounce TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS grind TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS head_number TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS spec_provenance JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_standard_spec_status_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_standard_spec_status_check
  CHECK (standard_spec_status IS NULL OR standard_spec_status IN ('standard', 'customised', 'unknown'));

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_listing_format_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_listing_format_check
  CHECK (listing_format IS NULL OR listing_format IN ('single', 'set'));

UPDATE public.listings
SET listing_format = 'single'
WHERE listing_format IS NULL
  AND category IN ('Driver', 'Woods', 'Driving Irons', 'Hybrids', 'Irons', 'Wedges', 'Putter');

CREATE TABLE IF NOT EXISTS public.listing_clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  club_type TEXT NOT NULL DEFAULT 'wedge',
  iron_number TEXT,
  degree TEXT,
  bounce TEXT,
  grind TEXT,
  shaft TEXT,
  shaft_flex TEXT,
  lie_angle TEXT,
  club_length TEXT,
  shaft_weight TEXT,
  shaft_material TEXT,
  grip_brand TEXT,
  grip_model TEXT,
  grip_size TEXT,
  grip_condition TEXT,
  spec_provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_clubs_listing_id ON public.listing_clubs(listing_id);

ALTER TABLE public.listing_clubs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read listing clubs" ON public.listing_clubs;
CREATE POLICY "Read listing clubs"
  ON public.listing_clubs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_id
        AND ((l.status IN ('pending', 'verified') AND l.archived_at IS NULL) OR l.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Insert listing clubs for own listing" ON public.listing_clubs;
CREATE POLICY "Insert listing clubs for own listing"
  ON public.listing_clubs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_id AND l.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Update listing clubs for own listing" ON public.listing_clubs;
CREATE POLICY "Update listing clubs for own listing"
  ON public.listing_clubs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_id AND l.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Delete listing clubs for own listing" ON public.listing_clubs;
CREATE POLICY "Delete listing clubs for own listing"
  ON public.listing_clubs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_id AND l.user_id = auth.uid()
    )
  );
