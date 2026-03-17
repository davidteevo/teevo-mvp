-- Admin create listing on behalf: users and listings metadata + audit usage

-- Users: admin-created flag, invite timestamp, optional phone
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_by_admin BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;

COMMENT ON COLUMN public.users.created_by_admin IS 'True when account was created by an admin (e.g. for onboarding sellers).';
COMMENT ON COLUMN public.users.invited_at IS 'When invite email was sent (for admin-created accounts).';
COMMENT ON COLUMN public.users.phone IS 'Optional phone number.';

-- Listings: created by admin on behalf of seller
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS created_by_admin_id UUID REFERENCES public.users(id);
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS created_on_behalf BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.listings.created_by_admin_id IS 'Admin user who created this listing on behalf of the owner.';
COMMENT ON COLUMN public.listings.created_on_behalf IS 'True when listing was created by admin for another user.';
