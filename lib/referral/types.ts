export const ReferralRewardType = {
  BUYER_REFERRER_CREDIT: "buyer_referrer_credit",
  SELLER_LISTING_CREDIT: "seller_listing_credit",
  SELLER_SALE_CREDIT: "seller_sale_credit",
  CREATOR_COMMISSION: "creator_commission",
  REFERRED_SELLER_LISTING_CREDIT: "referred_seller_listing_credit",
  CREATOR_NEW_USER_REWARD: "creator_new_user_reward",
  CREATOR_LISTING_REWARD: "creator_listing_reward",
  CREATOR_TRANSACTION_REWARD: "creator_transaction_reward",
} as const;

export function isCreatorMilestoneRewardType(rewardType: string): boolean {
  return (
    rewardType === ReferralRewardType.CREATOR_NEW_USER_REWARD ||
    rewardType === ReferralRewardType.CREATOR_LISTING_REWARD ||
    rewardType === ReferralRewardType.CREATOR_TRANSACTION_REWARD
  );
}

export const ReferralPriority = {
  SUPPLY: "supply",
  DEMAND: "demand",
} as const;

export type ReferralPriorityValue = (typeof ReferralPriority)[keyof typeof ReferralPriority];

export type ReferralRewardTypeValue = (typeof ReferralRewardType)[keyof typeof ReferralRewardType];

export const ReferralRewardStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  PAID: "paid",
  CANCELLED: "cancelled",
  REVERSED: "reversed",
} as const;

export type ReferralRewardStatusValue =
  (typeof ReferralRewardStatus)[keyof typeof ReferralRewardStatus];
