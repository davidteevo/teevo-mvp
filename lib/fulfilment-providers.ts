/**
 * Fulfilment provider mode and provider-agnostic tracking helpers.
 * Shippo path stays in lib/shippo.ts; manual path writes generic columns on transactions.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getAppUrl } from "@/lib/app-env";

export const FulfilmentMode = {
  SHIPPO: "shippo",
  MANUAL: "manual",
} as const;
export type FulfilmentModeType = (typeof FulfilmentMode)[keyof typeof FulfilmentMode];

export const PLATFORM_SETTING_FULFILMENT_MODE = "fulfilment_mode";

export const MANUAL_COURIERS = [
  "Evri",
  "Royal Mail",
  "DPD",
  "UPS",
  "DHL",
  "Other",
] as const;
export type ManualCourier = (typeof MANUAL_COURIERS)[number];

const DPD_TRACK_BASE = "https://track.dpd.co.uk/status";

export type TrackingFields = {
  fulfilment_mode?: string | null;
  courier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  shipping_label_url?: string | null;
  shippo_label_url?: string | null;
  shippo_tracking_number?: string | null;
};

export function isFulfilmentMode(value: unknown): value is FulfilmentModeType {
  return value === FulfilmentMode.SHIPPO || value === FulfilmentMode.MANUAL;
}

export async function getPlatformFulfilmentMode(
  admin: SupabaseClient
): Promise<FulfilmentModeType> {
  const { data } = await admin
    .from("platform_settings")
    .select("value")
    .eq("key", PLATFORM_SETTING_FULFILMENT_MODE)
    .maybeSingle();
  if (isFulfilmentMode(data?.value)) return data.value;
  return FulfilmentMode.SHIPPO;
}

export async function setPlatformFulfilmentMode(
  admin: SupabaseClient,
  mode: FulfilmentModeType
): Promise<void> {
  const { error } = await admin.from("platform_settings").upsert(
    {
      key: PLATFORM_SETTING_FULFILMENT_MODE,
      value: mode,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
  if (error) throw new Error(error.message);
}

export function hasShippingLabel(tx: TrackingFields): boolean {
  return !!(tx.shippo_label_url || tx.shipping_label_url);
}

export function getTrackingNumber(tx: TrackingFields): string | null {
  if (tx.tracking_number?.trim()) return tx.tracking_number.trim();
  if (tx.shippo_tracking_number?.trim()) return tx.shippo_tracking_number.trim();
  return null;
}

export function getTrackingUrl(tx: TrackingFields): string | null {
  if (tx.tracking_url?.trim()) return tx.tracking_url.trim();
  const number = getTrackingNumber(tx);
  if (number && (tx.courier === "DPD" || (!tx.courier && tx.shippo_tracking_number))) {
    return `${DPD_TRACK_BASE}/${number}`;
  }
  if (number && tx.shippo_tracking_number && !tx.tracking_url) {
    return `${DPD_TRACK_BASE}/${number}`;
  }
  return null;
}

/** CTA link for buyer shipping confirmation email. */
export function getBuyerTrackingCta(tx: TrackingFields): string {
  return getTrackingUrl(tx) ?? `${getAppUrl()}/dashboard/purchases`;
}
