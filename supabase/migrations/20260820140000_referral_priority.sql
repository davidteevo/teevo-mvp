-- Referral growth priority (supply vs demand) snapshotted per referral at signup.

ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS reward_priority TEXT
  CHECK (reward_priority IS NULL OR reward_priority IN ('supply', 'demand'));

COMMENT ON COLUMN public.referrals.reward_priority IS
  'Priority active when referral was attributed: supply | demand. NULL = legacy.';

-- referral_rewards: referred seller listing credit
ALTER TABLE public.referral_rewards
  DROP CONSTRAINT IF EXISTS referral_rewards_reward_type_check;

ALTER TABLE public.referral_rewards
  ADD CONSTRAINT referral_rewards_reward_type_check
  CHECK (reward_type IN (
    'buyer_referrer_credit',
    'seller_listing_credit',
    'seller_sale_credit',
    'creator_commission',
    'referred_seller_listing_credit'
  ));

-- credit_transactions: referred_seller_listing_credit
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
    'founder_listing_reward'
  ));

DROP INDEX IF EXISTS uniq_credit_issue_reward;
CREATE UNIQUE INDEX uniq_credit_issue_reward
  ON public.credit_transactions (referral_reward_id)
  WHERE type IN (
    'referral_buyer_reward',
    'seller_listing_referral',
    'seller_sale_referral',
    'referred_seller_listing_credit'
  )
  AND referral_reward_id IS NOT NULL;

INSERT INTO public.platform_settings (key, value)
VALUES ('referral_priority', 'supply')
ON CONFLICT (key) DO NOTHING;
