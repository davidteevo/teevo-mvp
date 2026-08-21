-- Admin new-user digest: track which registrations have been included in an admin email.
-- Prefer applying via supabase/migrations/20260821140000_admin_signup_digest.sql.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS admin_signup_digest_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.users.admin_signup_digest_sent_at IS
  'When this user was included in an admin signup digest email. NULL = not yet reported.';

-- Backfill so existing users never dump into the first digest after deploy.
UPDATE public.users
SET admin_signup_digest_sent_at = NOW()
WHERE admin_signup_digest_sent_at IS NULL;

CREATE INDEX IF NOT EXISTS users_admin_signup_digest_pending_idx
  ON public.users (created_at DESC)
  WHERE admin_signup_digest_sent_at IS NULL;
