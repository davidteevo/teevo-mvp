-- Wipe test sales/financial rows from production BEFORE going live.
-- Run in the Teevo Production Supabase SQL Editor (not Staging).
-- Skips tables that have not been migrated yet (e.g. referral_rewards).
-- Safe to re-run.

DO $$
DECLARE
  deleted_count bigint;
BEGIN
  -- Reviews must go first: seller_reviews REFERENCES transactions ON DELETE RESTRICT
  IF to_regclass('public.seller_review_reports') IS NOT NULL THEN
    DELETE FROM public.seller_review_reports;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % seller_review_reports', deleted_count;
  ELSE
    RAISE NOTICE 'Skipped seller_review_reports (table does not exist)';
  END IF;

  IF to_regclass('public.seller_review_moderation_events') IS NOT NULL THEN
    DELETE FROM public.seller_review_moderation_events;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % seller_review_moderation_events', deleted_count;
  ELSE
    RAISE NOTICE 'Skipped seller_review_moderation_events (table does not exist)';
  END IF;

  IF to_regclass('public.seller_reviews') IS NOT NULL THEN
    DELETE FROM public.seller_reviews;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % seller_reviews', deleted_count;
  ELSE
    RAISE NOTICE 'Skipped seller_reviews (table does not exist)';
  END IF;

  -- Referral/credit tables exist only after the 20260817 migration
  IF to_regclass('public.referral_rewards') IS NOT NULL THEN
    DELETE FROM public.referral_rewards;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % referral_rewards', deleted_count;
  ELSE
    RAISE NOTICE 'Skipped referral_rewards (table does not exist)';
  END IF;

  IF to_regclass('public.credit_transactions') IS NOT NULL THEN
    DELETE FROM public.credit_transactions;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % credit_transactions', deleted_count;
  ELSE
    RAISE NOTICE 'Skipped credit_transactions (table does not exist)';
  END IF;

  IF to_regclass('public.notifications') IS NOT NULL THEN
    DELETE FROM public.notifications WHERE entity_type = 'transaction';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % transaction notifications', deleted_count;
  ELSE
    RAISE NOTICE 'Skipped notifications (table does not exist)';
  END IF;

  IF to_regclass('public.sent_emails') IS NOT NULL THEN
    DELETE FROM public.sent_emails WHERE reference_type = 'transaction';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % sent_emails', deleted_count;
  ELSE
    RAISE NOTICE 'Skipped sent_emails (table does not exist)';
  END IF;

  IF to_regclass('public.events') IS NOT NULL THEN
    DELETE FROM public.events
    WHERE properties ? 'transaction_id'
       OR name ILIKE '%checkout%'
       OR name ILIKE '%sale%'
       OR name ILIKE '%payout%';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % events', deleted_count;
  ELSE
    RAISE NOTICE 'Skipped events (table does not exist)';
  END IF;

  IF to_regclass('public.admin_actions') IS NOT NULL THEN
    DELETE FROM public.admin_actions WHERE target_type = 'transaction';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % admin_actions', deleted_count;
  ELSE
    RAISE NOTICE 'Skipped admin_actions (table does not exist)';
  END IF;

  -- transaction_events cascade from this delete if the table exists
  DELETE FROM public.transactions;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % transactions', deleted_count;

  -- Put test-sold listings back on the marketplace
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'listings'
      AND column_name = 'availability_confirmation_status'
  ) THEN
    UPDATE public.listings
    SET status = 'verified',
        availability_confirmation_status = NULL,
        updated_at = NOW()
    WHERE status = 'sold';
  ELSE
    UPDATE public.listings
    SET status = 'verified',
        updated_at = NOW()
    WHERE status = 'sold';
  END IF;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Reset % sold listings to verified', deleted_count;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'rating_average'
  ) THEN
    UPDATE public.users
    SET rating_average = NULL,
        rating_count = 0
    WHERE rating_count <> 0 OR rating_average IS NOT NULL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Reset ratings on % users', deleted_count;
  ELSE
    RAISE NOTICE 'Skipped user rating reset (columns do not exist)';
  END IF;
END
$$;

-- Confirm dashboard numbers should now be zero
SELECT count(*) AS tx_count,
       coalesce(sum(amount) FILTER (WHERE status IN ('complete', 'shipped')), 0) AS gmv_pence
FROM public.transactions;

SELECT count(*) AS sold_listings
FROM public.listings
WHERE status = 'sold';
