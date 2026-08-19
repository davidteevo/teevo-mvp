-- Reset stale Stripe connected account IDs that belong to another platform/mode.
-- Run in Supabase SQL Editor (production project) when users see:
-- "account is not connected to your platform or does not exist"

UPDATE users
SET stripe_account_id = NULL,
    updated_at = NOW()
WHERE stripe_account_id IN (
  'acct_1T46hVQsC7FKxs4o',
  'acct_1T1bRiJ7nd9giawL'
);

-- Optional: reset a single user by email
-- UPDATE users
-- SET stripe_account_id = NULL, updated_at = NOW()
-- WHERE email = 'your@email.com';
