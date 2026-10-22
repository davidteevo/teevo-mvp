/**
 * Global Teevo Fit public kill switch. The setting key stays match_enabled.
 * Stored in platform_settings.match_enabled. Fail-closed: missing/invalid/error → disabled.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const PLATFORM_SETTING_MATCH_ENABLED = "match_enabled";

export const MATCH_DISABLED_ERROR = "Teevo Fit is not currently available.";

export const MATCH_EVENTS = {
  ENABLED: "match_enabled",
  DISABLED: "match_disabled",
} as const;

export class MatchDisabledError extends Error {
  constructor(message = MATCH_DISABLED_ERROR) {
    super(message);
    this.name = "MatchDisabledError";
  }
}

export function parseMatchEnabled(value: unknown): boolean {
  return value === "true" || value === true;
}

export async function isMatchEnabled(admin: SupabaseClient): Promise<boolean> {
  try {
    const { data, error } = await admin
      .from("platform_settings")
      .select("value")
      .eq("key", PLATFORM_SETTING_MATCH_ENABLED)
      .maybeSingle();
    if (error) return false;
    return parseMatchEnabled(data?.value);
  } catch {
    return false;
  }
}

export async function setMatchEnabled(
  admin: SupabaseClient,
  enabled: boolean
): Promise<void> {
  const { error } = await admin.from("platform_settings").upsert(
    {
      key: PLATFORM_SETTING_MATCH_ENABLED,
      value: enabled ? "true" : "false",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
  if (error) throw new Error(error.message);
}

export async function matchDisabledResponse(
  admin: SupabaseClient
): Promise<NextResponse | null> {
  if (await isMatchEnabled(admin)) return null;
  return NextResponse.json({ error: MATCH_DISABLED_ERROR }, { status: 403 });
}
