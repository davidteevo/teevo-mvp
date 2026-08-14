import type { SupabaseClient } from "@supabase/supabase-js";

export const PLATFORM_SETTING_DISPATCH_DEADLINE_DAYS = "dispatch_deadline_business_days";
export const PLATFORM_SETTING_DISPATCH_EXTENSION_DAYS = "dispatch_extension_business_days";
export const PLATFORM_SETTING_DISPATCH_MAX_EXTENSIONS = "dispatch_max_extensions";

export const DEFAULT_DISPATCH_DEADLINE_BUSINESS_DAYS = 5;
export const DEFAULT_DISPATCH_EXTENSION_BUSINESS_DAYS = 3;
export const DEFAULT_DISPATCH_MAX_EXTENSIONS = 1;

function parsePositiveInt(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) : NaN;
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.trunc(n);
}

async function readSetting(admin: SupabaseClient, key: string): Promise<string | null> {
  const { data } = await admin.from("platform_settings").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}

export async function getDispatchDeadlineBusinessDays(admin: SupabaseClient): Promise<number> {
  const value = await readSetting(admin, PLATFORM_SETTING_DISPATCH_DEADLINE_DAYS);
  return parsePositiveInt(value, DEFAULT_DISPATCH_DEADLINE_BUSINESS_DAYS);
}

export async function getDispatchExtensionBusinessDays(admin: SupabaseClient): Promise<number> {
  const value = await readSetting(admin, PLATFORM_SETTING_DISPATCH_EXTENSION_DAYS);
  return parsePositiveInt(value, DEFAULT_DISPATCH_EXTENSION_BUSINESS_DAYS);
}

export async function getDispatchMaxExtensions(admin: SupabaseClient): Promise<number> {
  const value = await readSetting(admin, PLATFORM_SETTING_DISPATCH_MAX_EXTENSIONS);
  return parsePositiveInt(value, DEFAULT_DISPATCH_MAX_EXTENSIONS);
}
