# Migration: offers.initiated_by

The app expects an `initiated_by` column on `public.offers` (values `'buyer'` or `'seller'`). If you see:

- **"Could not find the 'initiated_by' column of 'offers' in the schema cache"**, or  
- **"column offers.initiated_by does not exist" (42703)**

then this migration has not been applied to the database you’re using.

## Apply the migration

Run the following SQL against your Supabase project (e.g. **Supabase Dashboard → SQL Editor**), or run the migration file via your usual process:

```sql
-- Distinguish buyer-initiated vs seller-initiated offers for UI (e.g. seller can propose first).
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS initiated_by TEXT NOT NULL DEFAULT 'buyer' CHECK (initiated_by IN ('buyer', 'seller'));
```

Source file: `supabase/migrations/20250309150000_offers_initiated_by.sql`

After applying, reload the app and try making an offer again.
