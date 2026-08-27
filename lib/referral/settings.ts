/**
 * Referral / growth settings stored in platform_settings.
 * Changes affect future rewards only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { ReferralPriority, type ReferralPriorityValue } from "@/lib/referral/types";

export const ReferralSettingKey = {
  PROGRAMME_ENABLED: "referral_programme_enabled",
  DISCOUNT_PENCE: "referral_discount_pence",
  REFERRER_REWARD_PENCE: "referrer_reward_pence",
  MIN_ITEM_PENCE: "referral_min_item_pence",
  SELLER_ENABLED: "seller_referral_enabled",
  SELLER_LISTING_REWARD_PENCE: "seller_listing_reward_pence",
  SELLER_SALE_REWARD_PENCE: "seller_sale_reward_pence",
  CREATOR_ENABLED: "creator_programme_enabled",
  CREATOR_NEW_USER_REWARD_ENABLED: "creator_new_user_reward_enabled",
  CREATOR_NEW_USER_REWARD_PENCE: "creator_new_user_reward_pence",
  CREATOR_LISTING_REWARD_ENABLED: "creator_listing_reward_enabled",
  CREATOR_LISTING_REWARD_PENCE: "creator_listing_reward_pence",
  CREATOR_TRANSACTION_REWARD_ENABLED: "creator_transaction_reward_enabled",
  CREATOR_TRANSACTION_REWARD_PENCE: "creator_transaction_reward_pence",
  CREATOR_MISSION_TITLE: "creator_mission_title",
  CREATOR_MISSION_BODY: "creator_mission_body",
  CREATOR_MISSION_CTA_LABEL: "creator_mission_cta_label",
  CREATOR_MISSION_CTA_URL: "creator_mission_cta_url",
  CREATOR_MISSION_REWARD_CALLOUT: "creator_mission_reward_callout",
  CREATOR_MONTHLY_REFERRAL_TARGET: "creator_monthly_referral_target",
  CREDIT_ENABLED: "credit_enabled",
  CREDIT_EXPIRY_DAYS: "credit_expiry_days",
  REFERRAL_PRIORITY: "referral_priority",
} as const;

export type ReferralSettings = {
  programmeEnabled: boolean;
  discountPence: number;
  referrerRewardPence: number;
  minItemPence: number;
  sellerEnabled: boolean;
  sellerListingRewardPence: number;
  sellerSaleRewardPence: number;
  creatorEnabled: boolean;
  creatorNewUserRewardEnabled: boolean;
  creatorNewUserRewardPence: number;
  creatorListingRewardEnabled: boolean;
  creatorListingRewardPence: number;
  creatorTransactionRewardEnabled: boolean;
  creatorTransactionRewardPence: number;
  creatorMissionTitle: string;
  creatorMissionBody: string;
  creatorMissionCtaLabel: string;
  creatorMissionCtaUrl: string;
  creatorMissionRewardCallout: string;
  creatorMonthlyReferralTarget: number;
  creditEnabled: boolean;
  creditExpiryDays: number | null;
  referralPriority: ReferralPriorityValue;
};

export const DEFAULT_REFERRAL_SETTINGS: ReferralSettings = {
  programmeEnabled: true,
  discountPence: 500,
  referrerRewardPence: 500,
  minItemPence: 5000,
  sellerEnabled: true,
  sellerListingRewardPence: 500,
  sellerSaleRewardPence: 500,
  creatorEnabled: true,
  creatorNewUserRewardEnabled: true,
  creatorNewUserRewardPence: 200,
  creatorListingRewardEnabled: true,
  creatorListingRewardPence: 1000,
  creatorTransactionRewardEnabled: true,
  creatorTransactionRewardPence: 500,
  creatorMissionTitle: "Bring more clubs onto Teevo",
  creatorMissionBody:
    "We're building the marketplace. More great listings = more reasons for golfers to come back.",
  creatorMissionCtaLabel: "Find a seller",
  creatorMissionCtaUrl: "",
  creatorMissionRewardCallout: "First approved listing from each new referral = {listing}",
  creatorMonthlyReferralTarget: 10,
  creditEnabled: true,
  creditExpiryDays: null,
  referralPriority: ReferralPriority.SUPPLY,
};

function parseBool(value: unknown, fallback: boolean): boolean {
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return fallback;
}

function parseNonNegInt(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = parseInt(value, 10);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return fallback;
}

function parseExpiryDays(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = parseNonNegInt(value, -1);
  if (n <= 0) return null;
  return n;
}

function parseReferralPriority(value: unknown): ReferralPriorityValue {
  if (value === ReferralPriority.DEMAND || value === "DEMAND") return ReferralPriority.DEMAND;
  if (value === ReferralPriority.SUPPLY || value === "SUPPLY") return ReferralPriority.SUPPLY;
  return DEFAULT_REFERRAL_SETTINGS.referralPriority;
}

function parseString(value: unknown, fallback: string): string {
  if (typeof value === "string") return value;
  if (value == null) return fallback;
  return String(value);
}

function parsePositiveInt(value: unknown, fallback: number): number {
  const n = parseNonNegInt(value, fallback);
  return n > 0 ? n : fallback;
}

export async function getReferralSettings(admin: SupabaseClient): Promise<ReferralSettings> {
  const keys = Object.values(ReferralSettingKey);
  const { data, error } = await admin.from("platform_settings").select("key, value").in("key", keys);
  if (error || !data) return { ...DEFAULT_REFERRAL_SETTINGS };
  const map = new Map<string, string>();
  for (const row of data) {
    if (typeof row.key === "string") map.set(row.key, String(row.value ?? ""));
  }
  return {
    programmeEnabled: parseBool(map.get(ReferralSettingKey.PROGRAMME_ENABLED), DEFAULT_REFERRAL_SETTINGS.programmeEnabled),
    discountPence: parseNonNegInt(map.get(ReferralSettingKey.DISCOUNT_PENCE), DEFAULT_REFERRAL_SETTINGS.discountPence),
    referrerRewardPence: parseNonNegInt(
      map.get(ReferralSettingKey.REFERRER_REWARD_PENCE),
      DEFAULT_REFERRAL_SETTINGS.referrerRewardPence
    ),
    minItemPence: parseNonNegInt(map.get(ReferralSettingKey.MIN_ITEM_PENCE), DEFAULT_REFERRAL_SETTINGS.minItemPence),
    sellerEnabled: parseBool(map.get(ReferralSettingKey.SELLER_ENABLED), DEFAULT_REFERRAL_SETTINGS.sellerEnabled),
    sellerListingRewardPence: parseNonNegInt(
      map.get(ReferralSettingKey.SELLER_LISTING_REWARD_PENCE),
      DEFAULT_REFERRAL_SETTINGS.sellerListingRewardPence
    ),
    sellerSaleRewardPence: parseNonNegInt(
      map.get(ReferralSettingKey.SELLER_SALE_REWARD_PENCE),
      DEFAULT_REFERRAL_SETTINGS.sellerSaleRewardPence
    ),
    creatorEnabled: parseBool(map.get(ReferralSettingKey.CREATOR_ENABLED), DEFAULT_REFERRAL_SETTINGS.creatorEnabled),
    creatorNewUserRewardEnabled: parseBool(
      map.get(ReferralSettingKey.CREATOR_NEW_USER_REWARD_ENABLED),
      DEFAULT_REFERRAL_SETTINGS.creatorNewUserRewardEnabled
    ),
    creatorNewUserRewardPence: parseNonNegInt(
      map.get(ReferralSettingKey.CREATOR_NEW_USER_REWARD_PENCE),
      DEFAULT_REFERRAL_SETTINGS.creatorNewUserRewardPence
    ),
    creatorListingRewardEnabled: parseBool(
      map.get(ReferralSettingKey.CREATOR_LISTING_REWARD_ENABLED),
      DEFAULT_REFERRAL_SETTINGS.creatorListingRewardEnabled
    ),
    creatorListingRewardPence: parseNonNegInt(
      map.get(ReferralSettingKey.CREATOR_LISTING_REWARD_PENCE),
      DEFAULT_REFERRAL_SETTINGS.creatorListingRewardPence
    ),
    creatorTransactionRewardEnabled: parseBool(
      map.get(ReferralSettingKey.CREATOR_TRANSACTION_REWARD_ENABLED),
      DEFAULT_REFERRAL_SETTINGS.creatorTransactionRewardEnabled
    ),
    creatorTransactionRewardPence: parseNonNegInt(
      map.get(ReferralSettingKey.CREATOR_TRANSACTION_REWARD_PENCE),
      DEFAULT_REFERRAL_SETTINGS.creatorTransactionRewardPence
    ),
    creatorMissionTitle: parseString(
      map.get(ReferralSettingKey.CREATOR_MISSION_TITLE),
      DEFAULT_REFERRAL_SETTINGS.creatorMissionTitle
    ),
    creatorMissionBody: parseString(
      map.get(ReferralSettingKey.CREATOR_MISSION_BODY),
      DEFAULT_REFERRAL_SETTINGS.creatorMissionBody
    ),
    creatorMissionCtaLabel: parseString(
      map.get(ReferralSettingKey.CREATOR_MISSION_CTA_LABEL),
      DEFAULT_REFERRAL_SETTINGS.creatorMissionCtaLabel
    ),
    creatorMissionCtaUrl: parseString(
      map.get(ReferralSettingKey.CREATOR_MISSION_CTA_URL),
      DEFAULT_REFERRAL_SETTINGS.creatorMissionCtaUrl
    ),
    creatorMissionRewardCallout: parseString(
      map.get(ReferralSettingKey.CREATOR_MISSION_REWARD_CALLOUT),
      DEFAULT_REFERRAL_SETTINGS.creatorMissionRewardCallout
    ),
    creatorMonthlyReferralTarget: parsePositiveInt(
      map.get(ReferralSettingKey.CREATOR_MONTHLY_REFERRAL_TARGET),
      DEFAULT_REFERRAL_SETTINGS.creatorMonthlyReferralTarget
    ),
    creditEnabled: parseBool(map.get(ReferralSettingKey.CREDIT_ENABLED), DEFAULT_REFERRAL_SETTINGS.creditEnabled),
    creditExpiryDays: parseExpiryDays(map.get(ReferralSettingKey.CREDIT_EXPIRY_DAYS)),
    referralPriority: parseReferralPriority(map.get(ReferralSettingKey.REFERRAL_PRIORITY)),
  };
}

export type ReferralSettingsPatch = Partial<{
  programmeEnabled: boolean;
  discountPence: number;
  referrerRewardPence: number;
  minItemPence: number;
  sellerEnabled: boolean;
  sellerListingRewardPence: number;
  sellerSaleRewardPence: number;
  creatorEnabled: boolean;
  creatorNewUserRewardEnabled: boolean;
  creatorNewUserRewardPence: number;
  creatorListingRewardEnabled: boolean;
  creatorListingRewardPence: number;
  creatorTransactionRewardEnabled: boolean;
  creatorTransactionRewardPence: number;
  creatorMissionTitle: string;
  creatorMissionBody: string;
  creatorMissionCtaLabel: string;
  creatorMissionCtaUrl: string;
  creatorMissionRewardCallout: string;
  creatorMonthlyReferralTarget: number;
  creditEnabled: boolean;
  creditExpiryDays: number | null;
  referralPriority: ReferralPriorityValue;
}>;

function penceOrThrow(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
    throw new Error(`${label} must be a non-negative integer (pence)`);
  }
  return value;
}

export async function setReferralSettings(
  admin: SupabaseClient,
  patch: ReferralSettingsPatch
): Promise<ReferralSettings> {
  const rows: { key: string; value: string; updated_at: string }[] = [];
  const now = new Date().toISOString();
  const addBool = (key: string, value: boolean | undefined) => {
    if (typeof value === "boolean") rows.push({ key, value: value ? "true" : "false", updated_at: now });
  };
  const addPence = (key: string, value: number | undefined, label: string) => {
    if (value !== undefined) rows.push({ key, value: String(penceOrThrow(value, label)), updated_at: now });
  };
  addBool(ReferralSettingKey.PROGRAMME_ENABLED, patch.programmeEnabled);
  addPence(ReferralSettingKey.DISCOUNT_PENCE, patch.discountPence, "Referred customer discount");
  addPence(ReferralSettingKey.REFERRER_REWARD_PENCE, patch.referrerRewardPence, "Referrer reward");
  addPence(ReferralSettingKey.MIN_ITEM_PENCE, patch.minItemPence, "Minimum qualifying purchase");
  addBool(ReferralSettingKey.SELLER_ENABLED, patch.sellerEnabled);
  addPence(ReferralSettingKey.SELLER_LISTING_REWARD_PENCE, patch.sellerListingRewardPence, "Supply listing reward");
  addPence(ReferralSettingKey.SELLER_SALE_REWARD_PENCE, patch.sellerSaleRewardPence, "First sale reward");
  addBool(ReferralSettingKey.CREATOR_ENABLED, patch.creatorEnabled);
  addBool(ReferralSettingKey.CREATOR_NEW_USER_REWARD_ENABLED, patch.creatorNewUserRewardEnabled);
  addPence(
    ReferralSettingKey.CREATOR_NEW_USER_REWARD_PENCE,
    patch.creatorNewUserRewardPence,
    "Creator new user reward"
  );
  addBool(ReferralSettingKey.CREATOR_LISTING_REWARD_ENABLED, patch.creatorListingRewardEnabled);
  addPence(
    ReferralSettingKey.CREATOR_LISTING_REWARD_PENCE,
    patch.creatorListingRewardPence,
    "Creator listing reward"
  );
  addBool(ReferralSettingKey.CREATOR_TRANSACTION_REWARD_ENABLED, patch.creatorTransactionRewardEnabled);
  addPence(
    ReferralSettingKey.CREATOR_TRANSACTION_REWARD_PENCE,
    patch.creatorTransactionRewardPence,
    "Creator transaction reward"
  );
  const addText = (key: string, value: string | undefined, maxLen: number) => {
    if (value === undefined) return;
    if (typeof value !== "string") throw new Error("Mission fields must be text");
    const trimmed = value.trim();
    if (trimmed.length > maxLen) throw new Error(`Text must be at most ${maxLen} characters`);
    rows.push({ key, value: trimmed, updated_at: now });
  };
  addText(ReferralSettingKey.CREATOR_MISSION_TITLE, patch.creatorMissionTitle, 120);
  addText(ReferralSettingKey.CREATOR_MISSION_BODY, patch.creatorMissionBody, 500);
  addText(ReferralSettingKey.CREATOR_MISSION_CTA_LABEL, patch.creatorMissionCtaLabel, 60);
  if (patch.creatorMissionCtaUrl !== undefined) {
    if (typeof patch.creatorMissionCtaUrl !== "string") {
      throw new Error("Mission CTA URL must be text");
    }
    const url = patch.creatorMissionCtaUrl.trim();
    if (url.length > 500) throw new Error("Mission CTA URL must be at most 500 characters");
    if (url && !url.startsWith("/") && !/^https?:\/\//i.test(url)) {
      throw new Error("Mission CTA URL must be a path or http(s) URL");
    }
    rows.push({
      key: ReferralSettingKey.CREATOR_MISSION_CTA_URL,
      value: url,
      updated_at: now,
    });
  }
  addText(ReferralSettingKey.CREATOR_MISSION_REWARD_CALLOUT, patch.creatorMissionRewardCallout, 240);
  if (patch.creatorMonthlyReferralTarget !== undefined) {
    const target = patch.creatorMonthlyReferralTarget;
    if (typeof target !== "number" || !Number.isInteger(target) || target < 1 || target > 1000) {
      throw new Error("Monthly referral target must be an integer between 1 and 1000");
    }
    rows.push({
      key: ReferralSettingKey.CREATOR_MONTHLY_REFERRAL_TARGET,
      value: String(target),
      updated_at: now,
    });
  }
  addBool(ReferralSettingKey.CREDIT_ENABLED, patch.creditEnabled);
  if (patch.referralPriority !== undefined) {
    if (
      patch.referralPriority !== ReferralPriority.SUPPLY &&
      patch.referralPriority !== ReferralPriority.DEMAND
    ) {
      throw new Error("Referral priority must be supply or demand");
    }
    rows.push({
      key: ReferralSettingKey.REFERRAL_PRIORITY,
      value: patch.referralPriority,
      updated_at: now,
    });
  }
  if (patch.creditExpiryDays !== undefined) {
    const days = patch.creditExpiryDays;
    if (days != null && (typeof days !== "number" || !Number.isInteger(days) || days < 0)) {
      throw new Error("Credit expiry days must be a non-negative integer or empty");
    }
    rows.push({
      key: ReferralSettingKey.CREDIT_EXPIRY_DAYS,
      value: days == null || days === 0 ? "" : String(days),
      updated_at: now,
    });
  }
  if (rows.length > 0) {
    const { error } = await admin.from("platform_settings").upsert(rows, { onConflict: "key" });
    if (error) throw new Error(error.message);
  }
  return getReferralSettings(admin);
}

export function creditExpiresAt(now: Date, expiryDays: number | null): string | null {
  if (expiryDays == null || expiryDays <= 0) return null;
  const d = new Date(now.getTime());
  d.setUTCDate(d.getUTCDate() + expiryDays);
  return d.toISOString();
}
