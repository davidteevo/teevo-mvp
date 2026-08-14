/**
 * Free Seller Starter Pack: platform toggle, per-order source, and box-type mapping.
 * Paid TEEVO_BOX path in lib/fulfilment.ts stays intact.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { categoryToParcelPreset, ParcelPreset } from "@/lib/shippo";
import type { BoxType } from "@/lib/fulfilment";
import { MANUAL_COURIERS, type ManualCourier } from "@/lib/fulfilment-providers";

export const PLATFORM_SETTING_STARTER_PACK = "free_starter_pack_enabled";

export const PackagingSource = {
  SELLER_OWN: "SELLER_OWN",
  TEEVO_PAID: "TEEVO_PAID",
  TEEVO_STARTER_PACK: "TEEVO_STARTER_PACK",
} as const;
export type PackagingSourceType = (typeof PackagingSource)[keyof typeof PackagingSource];

export const STARTER_PACK_EVENTS = {
  ENABLED: "starter_pack_enabled",
  DISABLED: "starter_pack_disabled",
  REQUESTED: "starter_pack_requested",
  ADMIN_NOTIFICATION_SENT: "starter_pack_admin_notification_sent",
  DISPATCHED: "starter_pack_dispatched",
  ORDER_COMPLETED: "starter_pack_order_completed",
} as const;

export function isPackagingSource(value: unknown): value is PackagingSourceType {
  return (
    value === PackagingSource.SELLER_OWN ||
    value === PackagingSource.TEEVO_PAID ||
    value === PackagingSource.TEEVO_STARTER_PACK
  );
}

export function parseStarterPackEnabled(value: unknown): boolean {
  return value === "true" || value === true;
}

export async function isFreeStarterPackEnabled(admin: SupabaseClient): Promise<boolean> {
  const { data } = await admin
    .from("platform_settings")
    .select("value")
    .eq("key", PLATFORM_SETTING_STARTER_PACK)
    .maybeSingle();
  return parseStarterPackEnabled(data?.value);
}

export async function setFreeStarterPackEnabled(
  admin: SupabaseClient,
  enabled: boolean
): Promise<void> {
  const { error } = await admin.from("platform_settings").upsert(
    {
      key: PLATFORM_SETTING_STARTER_PACK,
      value: enabled ? "true" : "false",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
  if (error) throw new Error(error.message);
}

export function categoryToBoxType(category: string | null | undefined): BoxType {
  switch (categoryToParcelPreset(category)) {
    case ParcelPreset.GOLF_DRIVER:
      return "DRIVER_BOX";
    case ParcelPreset.IRON_SET:
      return "IRON_SET_BOX";
    case ParcelPreset.PUTTER:
      return "PUTTER_BOX";
    default:
      return "SMALL_BOX";
  }
}

export function formatSellerAddress(seller: {
  address_line1?: string | null;
  address_line2?: string | null;
  address_city?: string | null;
  address_postcode?: string | null;
  address_country?: string | null;
}): string {
  return [
    seller.address_line1,
    seller.address_line2,
    seller.address_city,
    seller.address_postcode,
    seller.address_country,
  ]
    .filter((p): p is string => !!p && p.trim().length > 0)
    .join(", ");
}

export function hasSellerPostageAddress(seller: {
  address_line1?: string | null;
  address_city?: string | null;
  address_postcode?: string | null;
  address_country?: string | null;
}): boolean {
  return !!(
    seller.address_line1?.trim() &&
    seller.address_city?.trim() &&
    seller.address_postcode?.trim() &&
    seller.address_country?.trim()
  );
}

export type StarterPackTrackingInput = {
  courier: ManualCourier;
  tracking_number: string;
  tracking_url: string;
};

export function parseStarterPackTracking(body: {
  courier?: unknown;
  tracking_number?: unknown;
  tracking_url?: unknown;
}): { ok: true; value: StarterPackTrackingInput } | { ok: false; error: string } {
  const courierRaw = typeof body.courier === "string" ? body.courier.trim() : "";
  const trackingNumber =
    typeof body.tracking_number === "string" ? body.tracking_number.trim() : "";
  const trackingUrl = typeof body.tracking_url === "string" ? body.tracking_url.trim() : "";

  if (!MANUAL_COURIERS.includes(courierRaw as ManualCourier)) {
    return { ok: false, error: `courier must be one of: ${MANUAL_COURIERS.join(", ")}` };
  }
  if (!trackingNumber) {
    return { ok: false, error: "tracking_number is required" };
  }
  if (!trackingUrl) {
    return { ok: false, error: "tracking_url is required" };
  }
  try {
    // eslint-disable-next-line no-new
    new URL(trackingUrl);
  } catch {
    return { ok: false, error: "tracking_url must be a valid URL" };
  }

  return {
    ok: true,
    value: {
      courier: courierRaw as ManualCourier,
      tracking_number: trackingNumber,
      tracking_url: trackingUrl,
    },
  };
}

export async function trackServerEvent(
  admin: SupabaseClient,
  name: string,
  opts?: { userId?: string | null; properties?: Record<string, unknown> }
): Promise<void> {
  const { error } = await admin.from("events").insert({
    name,
    user_id: opts?.userId ?? null,
    properties: opts?.properties ?? {},
  });
  if (error) console.error("trackServerEvent failed", name, error);
}
