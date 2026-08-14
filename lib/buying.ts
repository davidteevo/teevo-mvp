/**
 * Global buying & payments kill switch.
 * Stored in platform_settings.buying_enabled. Fail-closed: missing/invalid/error → disabled.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const PLATFORM_SETTING_BUYING_ENABLED = "buying_enabled";

export const BUYING_DISABLED_ERROR = "Buying is not currently available on Teevo.";

export const BUYING_EVENTS = {
  ENABLED: "buying_enabled",
  DISABLED: "buying_disabled",
} as const;

export class BuyingDisabledError extends Error {
  constructor(message = BUYING_DISABLED_ERROR) {
    super(message);
    this.name = "BuyingDisabledError";
  }
}

export function parseBuyingEnabled(value: unknown): boolean {
  return value === "true" || value === true;
}

export async function isBuyingEnabled(admin: SupabaseClient): Promise<boolean> {
  try {
    const { data, error } = await admin
      .from("platform_settings")
      .select("value")
      .eq("key", PLATFORM_SETTING_BUYING_ENABLED)
      .maybeSingle();
    if (error) return false;
    return parseBuyingEnabled(data?.value);
  } catch {
    return false;
  }
}

export async function setBuyingEnabled(
  admin: SupabaseClient,
  enabled: boolean
): Promise<void> {
  const { error } = await admin.from("platform_settings").upsert(
    {
      key: PLATFORM_SETTING_BUYING_ENABLED,
      value: enabled ? "true" : "false",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
  if (error) throw new Error(error.message);
}

export async function buyingDisabledResponse(
  admin: SupabaseClient
): Promise<NextResponse | null> {
  if (await isBuyingEnabled(admin)) return null;
  return NextResponse.json({ error: BUYING_DISABLED_ERROR }, { status: 403 });
}
