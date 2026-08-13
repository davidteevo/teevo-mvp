-- Teevo base schema RLS reset (safe to re-run)
-- Use this if DATABASE_SCHEMA.sql fails with "policy already exists".
-- Paste the ENTIRE file into Supabase SQL Editor and Run.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Drop every existing policy on these tables (handles prior partial runs)
DO $reset$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('users', 'listings', 'listing_images', 'transactions')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END;
$reset$;

CREATE POLICY "Public read verified listings" ON public.listings FOR SELECT USING (status IN ('pending', 'verified') AND archived_at IS NULL);
CREATE POLICY "Users read own listings" ON public.listings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own listings" ON public.listings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own pending listings" ON public.listings FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Read listing images" ON public.listing_images FOR SELECT USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND ((l.status IN ('pending', 'verified') AND l.archived_at IS NULL) OR l.user_id = auth.uid())));
CREATE POLICY "Insert listing images for own listing" ON public.listing_images FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid()));
CREATE POLICY "Users read own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users read own transactions" ON public.transactions FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE OR REPLACE FUNCTION public.set_listing_sold()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $fn$
BEGIN
  UPDATE public.listings
  SET status = 'sold', updated_at = NOW()
  WHERE id = NEW.listing_id;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS on_transaction_created ON public.transactions;
CREATE TRIGGER on_transaction_created
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_listing_sold();
