/**
 * Buyer Protection Fee (Authenticity & Protection) stored in platform_settings.
 * Fail-closed: missing or invalid values throw; callers must not invent a fee.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { BuyerFeeConfig } from "@/lib/pricing";

export const BuyerFeeSettingKey = {
  PERCENTAGE: "buyer_fee_percentage",
  FIXED_PENCE: "buyer_fee_fixed_pence",
} as const;

export const BUYER_FEE_SETTINGS_UNAVAILABLE = "Buyer Protection Fee settings are unavailable.";

export class BuyerFeeSettingsError extends Error {
  constructor(message = BUYER_FEE_SETTINGS_UNAVAILABLE) {
    super(message);
    this.name = "BuyerFeeSettingsError";
  }
}

const PERCENTAGE_PATTERN = /^(?:100(?:\.0{1,2})?|\d{1,2}(?:\.\d{1,2})?)$/;

export function parseBuyerFeePercentage(value: unknown): number {
  const raw = typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : String(value ?? "").trim();
  if (!PERCENTAGE_PATTERN.test(raw)) {
    throw new BuyerFeeSettingsError("Percentage fee must be a number between 0 and 100 with at most two decimal places.");
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    throw new BuyerFeeSettingsError("Percentage fee must be between 0% and 100%.");
  }
  return n;
}

export function percentageToHundredths(percentage: number): number {
  return Math.round(percentage * 100);
}

export function formatBuyerFeePercentage(percentage: number): string {
  return percentage.toFixed(2);
}

export function parseBuyerFeeFixedPence(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= 0) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n) && Number.isInteger(n) && n >= 0) return n;
  }
  throw new BuyerFeeSettingsError("Fixed fee must be a non-negative amount in pence.");
}

export function parsePoundsToPence(raw: unknown, label: string): number {
  const s = String(raw ?? "").trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(s)) {
    throw new BuyerFeeSettingsError(`${label} must be a non-negative amount with at most two decimal places.`);
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) {
    throw new BuyerFeeSettingsError(`${label} cannot be negative.`);
  }
  return Math.round(n * 100);
}

export function toBuyerFeeConfig(percentage: number, fixedPence: number): BuyerFeeConfig {
  return {
    percentage,
    percentageHundredths: percentageToHundredths(percentage),
    fixedPence,
  };
}

function logAndThrow(message: string, cause?: unknown): never {
  console.error("[buyer-fee-settings]", message, cause ?? "");
  throw new BuyerFeeSettingsError(message);
}

export async function getBuyerFeeSettings(admin: SupabaseClient): Promise<BuyerFeeConfig> {
  const keys = [BuyerFeeSettingKey.PERCENTAGE, BuyerFeeSettingKey.FIXED_PENCE];
  let data: { key: string; value: string }[] | null = null;
  try {
    const result = await admin.from("platform_settings").select("key, value").in("key", keys);
    if (result.error) logAndThrow(BUYER_FEE_SETTINGS_UNAVAILABLE, result.error);
    data = result.data as { key: string; value: string }[] | null;
  } catch (e) {
    if (e instanceof BuyerFeeSettingsError) throw e;
    logAndThrow(BUYER_FEE_SETTINGS_UNAVAILABLE, e);
  }
  if (!data) logAndThrow(BUYER_FEE_SETTINGS_UNAVAILABLE);

  const map = new Map<string, string>();
  for (const row of data) {
    if (typeof row.key === "string") map.set(row.key, String(row.value ?? ""));
  }
  const percentageRaw = map.get(BuyerFeeSettingKey.PERCENTAGE);
  const fixedRaw = map.get(BuyerFeeSettingKey.FIXED_PENCE);
  if (percentageRaw == null || percentageRaw === "" || fixedRaw == null || fixedRaw === "") {
    logAndThrow(BUYER_FEE_SETTINGS_UNAVAILABLE);
  }
  try {
    const percentage = parseBuyerFeePercentage(percentageRaw);
    const fixedPence = parseBuyerFeeFixedPence(fixedRaw);
    return toBuyerFeeConfig(percentage, fixedPence);
  } catch (e) {
    if (e instanceof BuyerFeeSettingsError) {
      console.error("[buyer-fee-settings]", e.message);
      throw e;
    }
    logAndThrow(BUYER_FEE_SETTINGS_UNAVAILABLE, e);
  }
}

export type BuyerFeeSettingsPatch = {
  percentage: number;
  fixedPence: number;
};

export async function setBuyerFeeSettings(
  admin: SupabaseClient,
  patch: BuyerFeeSettingsPatch
): Promise<BuyerFeeConfig> {
  const percentage = parseBuyerFeePercentage(patch.percentage);
  const fixedPence = parseBuyerFeeFixedPence(patch.fixedPence);
  const now = new Date().toISOString();
  const { error } = await admin.from("platform_settings").upsert(
    [
      {
        key: BuyerFeeSettingKey.PERCENTAGE,
        value: formatBuyerFeePercentage(percentage),
        updated_at: now,
      },
      {
        key: BuyerFeeSettingKey.FIXED_PENCE,
        value: String(fixedPence),
        updated_at: now,
      },
    ],
    { onConflict: "key" }
  );
  if (error) logAndThrow("Failed to save Buyer Protection Fee settings.", error);
  return getBuyerFeeSettings(admin);
}
