export const ReferralRewardType = {
  BUYER_REFERRER_CREDIT: "buyer_referrer_credit",
  SELLER_LISTING_CREDIT: "seller_listing_credit",
  SELLER_SALE_CREDIT: "seller_sale_credit",
  CREATOR_COMMISSION: "creator_commission",
} as const;

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
