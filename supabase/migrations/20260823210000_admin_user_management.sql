-- Admin user management: account status, suspension metadata, internal notes.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_account_status_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_account_status_check
  CHECK (account_status IN ('active', 'suspended', 'restricted'));

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_users_account_status ON public.users (account_status);

CREATE TABLE IF NOT EXISTS public.admin_user_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_user_notes_user_created
  ON public.admin_user_notes (user_id, created_at DESC);

ALTER TABLE public.admin_user_notes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_listings_user_id ON public.listings(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON public.transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_seller ON public.transactions(seller_id);
