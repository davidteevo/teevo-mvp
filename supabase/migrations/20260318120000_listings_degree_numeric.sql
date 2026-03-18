-- Numeric loft for filters (e.g. degreeMin >= 13). Parsed from listings.degree text.

CREATE OR REPLACE FUNCTION public.parse_degree_numeric(deg text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  m text[];
BEGIN
  IF deg IS NULL OR btrim(deg) = '' THEN
    RETURN NULL;
  END IF;
  m := regexp_match(btrim(deg), '^[[:space:]]*([0-9]+(\.[0-9]+)?)');
  IF m IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN m[1]::numeric;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS degree_numeric numeric;

COMMENT ON COLUMN public.listings.degree_numeric IS 'Leading numeric from degree (loft); used for min-loft browse filters.';

UPDATE public.listings
SET degree_numeric = public.parse_degree_numeric(degree)
WHERE degree IS NOT NULL OR degree_numeric IS NOT NULL;

CREATE OR REPLACE FUNCTION public.listings_set_degree_numeric()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.degree_numeric := public.parse_degree_numeric(NEW.degree);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_listings_degree_numeric ON public.listings;
CREATE TRIGGER tr_listings_degree_numeric
  BEFORE INSERT OR UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.listings_set_degree_numeric();
