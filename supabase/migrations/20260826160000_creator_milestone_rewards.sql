-- Creator programme: milestone rewards as Teevo credit (signup / listing / transaction).

-- referral_rewards: three new creator milestone types (keep legacy creator_commission)
ALTER TABLE public.referral_rewards
  DROP CONSTRAINT IF EXISTS referral_rewards_reward_type_check;

ALTER TABLE public.referral_rewards
  ADD CONSTRAINT referral_rewards_reward_type_check
  CHECK (reward_type IN (
    'buyer_referrer_credit',
    'seller_listing_credit',
    'seller_sale_credit',
    'creator_commission',
    'referred_seller_listing_credit',
    'creator_new_user_reward',
    'creator_listing_reward',
    'creator_transaction_reward'
  ));

-- credit_transactions: single ledger type for creator milestones
ALTER TABLE public.credit_transactions
  DROP CONSTRAINT IF EXISTS credit_transactions_type_check;

ALTER TABLE public.credit_transactions
  ADD CONSTRAINT credit_transactions_type_check
  CHECK (type IN (
    'referral_buyer_reward',
    'seller_listing_referral',
    'seller_sale_referral',
    'referred_seller_listing_credit',
    'admin_adjustment',
    'redemption',
    'reversal',
    'founder_listing_reward',
    'creator_milestone_reward'
  ));

DROP INDEX IF EXISTS uniq_credit_issue_reward;
CREATE UNIQUE INDEX uniq_credit_issue_reward
  ON public.credit_transactions (referral_reward_id)
  WHERE type IN (
    'referral_buyer_reward',
    'seller_listing_referral',
    'seller_sale_referral',
    'referred_seller_listing_credit',
    'creator_milestone_reward'
  )
  AND referral_reward_id IS NOT NULL;

-- One Teevo user per creator when linked
CREATE UNIQUE INDEX IF NOT EXISTS uniq_creators_user_id
  ON public.creators (user_id)
  WHERE user_id IS NOT NULL;

-- Creator milestone settings (amounts in pence)
INSERT INTO public.platform_settings (key, value)
VALUES
  ('creator_new_user_reward_enabled', 'true'),
  ('creator_new_user_reward_pence', '200'),
  ('creator_listing_reward_enabled', 'true'),
  ('creator_listing_reward_pence', '1000'),
  ('creator_transaction_reward_enabled', 'true'),
  ('creator_transaction_reward_pence', '500')
ON CONFLICT (key) DO NOTHING;
