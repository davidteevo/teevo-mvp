-- Stripe payouts setup reminder: 24h after email confirmation.
-- Run in Supabase SQL editor if not applying via supabase/migrations.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email_confirmed_at TIMESTAMPTZ;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS stripe_setup_reminder_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.users.email_confirmed_at IS
  'When the user confirmed their email (copied from auth.users.email_confirmed_at). Used to schedule Stripe payouts setup reminder.';

COMMENT ON COLUMN public.users.stripe_setup_reminder_sent_at IS
  'When we sent (or skipped) the Stripe payouts setup reminder. NULL = not yet processed.';

-- Existing accounts: do not backfill email_confirmed_at or spam reminders.
UPDATE public.users
SET stripe_setup_reminder_sent_at = NOW()
WHERE stripe_setup_reminder_sent_at IS NULL;

CREATE INDEX IF NOT EXISTS users_stripe_setup_reminder_pending_idx
  ON public.users (email_confirmed_at)
  WHERE stripe_setup_reminder_sent_at IS NULL
    AND email_confirmed_at IS NOT NULL;
