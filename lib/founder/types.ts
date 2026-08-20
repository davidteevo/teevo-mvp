/**
 * Founding Members campaign — constants & types.
 * Uses existing users.founding_seller_rank (1–100) as the Founder number.
 */

export const FOUNDER_CAMPAIGN_LIMIT = 100;
export const FOUNDER_REWARD_PENCE = 500;

export const PLATFORM_SETTING_FOUNDER_STATUS = "founder_campaign_status";
export const PLATFORM_SETTING_FOUNDER_LIMIT = "founder_campaign_limit";

export type FounderCampaignStatus = "active" | "paused" | "complete";

export type FounderRewardStatus = "none" | "eligible" | "earned";

export const FOUNDER_EVENTS = {
  CAMPAIGN_VIEWED: "founder_campaign_viewed",
  CLAIM_CLICKED: "founder_claim_clicked",
  SIGNUP_STARTED: "founder_signup_started",
  SIGNUP_COMPLETED: "founder_signup_completed",
  NUMBER_ALLOCATED: "founder_number_allocated",
  LISTING_STARTED: "founder_listing_started",
  LISTING_COMPLETED: "founder_listing_completed",
  REWARD_EARNED: "founder_reward_earned",
  REFERRAL_SHARED: "founder_referral_shared",
} as const;

export function parseFounderCampaignStatus(value: unknown): FounderCampaignStatus {
  if (value === "paused" || value === "complete" || value === "active") return value;
  return "active";
}

export function parseFounderLimit(value: unknown): number {
  const n = typeof value === "string" ? parseInt(value, 10) : typeof value === "number" ? value : NaN;
  if (!Number.isFinite(n) || n < 1) return FOUNDER_CAMPAIGN_LIMIT;
  return Math.min(FOUNDER_CAMPAIGN_LIMIT, Math.floor(n));
}
