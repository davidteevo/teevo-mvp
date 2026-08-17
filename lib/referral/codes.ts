import type { SupabaseClient } from "@supabase/supabase-js";
import { getAppUrl } from "@/lib/app-env";

export const RESERVED_REFERRAL_CODES = new Set([
  "TEEVO",
  "ADMIN",
  "SUPPORT",
  "HELP",
  "WWW",
  "API",
  "AUTH",
  "LOGIN",
  "SIGNUP",
  "DASHBOARD",
  "GOLF",
  "STAFF",
  "OFFICIAL",
  "ROOT",
  "NULL",
  "SYSTEM",
  "MODERATOR",
  "MOD",
  "TEAM",
  "HQ",
  "TEEVOHQ",
]);

const CODE_MAX_LEN = 16;
const CODE_MIN_LEN = 3;

export function normalizeReferralCode(raw: string | null | undefined): string {
  return (raw ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isReservedReferralCode(code: string): boolean {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return true;
  if (RESERVED_REFERRAL_CODES.has(normalized)) return true;
  if (normalized.startsWith("TEEVO")) return true;
  if (normalized.startsWith("ADMIN")) return true;
  return false;
}

export function isValidReferralCodeFormat(code: string): boolean {
  const normalized = normalizeReferralCode(code);
  if (normalized.length < CODE_MIN_LEN || normalized.length > CODE_MAX_LEN) return false;
  if (!/^[A-Z][A-Z0-9]*$/.test(normalized)) return false;
  if (isReservedReferralCode(normalized)) return false;
  return true;
}

export function baseCodeFromFirstName(firstName: string | null | undefined): string {
  const letters = (firstName ?? "")
    .normalize("NFKD")
    .replace(/[^\w]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 12);
  return letters.length >= CODE_MIN_LEN ? letters : "GOLFER";
}

/** Candidate at attempt 0 is the base; then BASE2, BASE3, … then BASE + 4 random digits. */
export function nextCodeCandidate(base: string, attempt: number): string {
  const normalizedBase = normalizeReferralCode(base) || "GOLFER";
  if (attempt === 0) return normalizedBase.slice(0, CODE_MAX_LEN);
  if (attempt < 50) {
    const suffix = String(attempt + 1);
    return `${normalizedBase.slice(0, CODE_MAX_LEN - suffix.length)}${suffix}`;
  }
  const rand = String(1000 + Math.floor(Math.random() * 9000));
  return `${normalizedBase.slice(0, CODE_MAX_LEN - rand.length)}${rand}`;
}

export function referralPath(code: string): string {
  return `/r/${encodeURIComponent(normalizeReferralCode(code))}`;
}

export function referralShareUrl(code: string, origin?: string): string {
  const base = (origin || getAppUrl()).replace(/\/$/, "");
  return `${base}${referralPath(code)}`;
}

export type ReferralCodeRow = {
  id: string;
  code: string;
  owner_user_id: string | null;
  kind: "user" | "creator";
  status: "active" | "disabled";
};

export async function lookupReferralCode(
  admin: SupabaseClient,
  rawCode: string
): Promise<ReferralCodeRow | null> {
  const code = normalizeReferralCode(rawCode);
  if (!code) return null;
  const { data } = await admin
    .from("referral_codes")
    .select("id, code, owner_user_id, kind, status")
    .eq("code", code)
    .maybeSingle();
  return (data as ReferralCodeRow | null) ?? null;
}

export async function getActiveUserCode(
  admin: SupabaseClient,
  userId: string
): Promise<ReferralCodeRow | null> {
  const { data } = await admin
    .from("referral_codes")
    .select("id, code, owner_user_id, kind, status")
    .eq("owner_user_id", userId)
    .eq("kind", "user")
    .eq("status", "active")
    .maybeSingle();
  return (data as ReferralCodeRow | null) ?? null;
}

export async function ensureUserReferralCode(
  admin: SupabaseClient,
  opts: { userId: string; firstName?: string | null }
): Promise<ReferralCodeRow | null> {
  const existing = await getActiveUserCode(admin, opts.userId);
  if (existing) return existing;

  const { data: anyCode } = await admin
    .from("referral_codes")
    .select("id, code, owner_user_id, kind, status")
    .eq("owner_user_id", opts.userId)
    .eq("kind", "user")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (anyCode) {
    if (anyCode.status !== "active") return anyCode as ReferralCodeRow;
  }

  const base = baseCodeFromFirstName(opts.firstName);
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const candidate = nextCodeCandidate(base, attempt);
    if (isReservedReferralCode(candidate) && attempt === 0) continue;
    const { data, error } = await admin
      .from("referral_codes")
      .insert({
        code: candidate,
        owner_user_id: opts.userId,
        kind: "user",
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .select("id, code, owner_user_id, kind, status")
      .maybeSingle();
    if (!error && data) return data as ReferralCodeRow;
    if (error && !/duplicate|unique/i.test(error.message)) {
      console.error("ensureUserReferralCode insert failed", error);
      return null;
    }
  }
  console.error("ensureUserReferralCode exhausted candidates", opts.userId);
  return null;
}

export async function createCreatorReferralCode(
  admin: SupabaseClient,
  opts: { code: string; ownerUserId?: string | null }
): Promise<{ ok: true; row: ReferralCodeRow } | { ok: false; error: string }> {
  const code = normalizeReferralCode(opts.code);
  if (!isValidReferralCodeFormat(code)) {
    return { ok: false, error: "That code isn’t available. Try a different one." };
  }
  const { data, error } = await admin
    .from("referral_codes")
    .insert({
      code,
      owner_user_id: opts.ownerUserId ?? null,
      kind: "creator",
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .select("id, code, owner_user_id, kind, status")
    .maybeSingle();
  if (error || !data) {
    if (error && /duplicate|unique/i.test(error.message)) {
      return { ok: false, error: "That code is already in use." };
    }
    return { ok: false, error: "Could not create that code. Try a different one." };
  }
  return { ok: true, row: data as ReferralCodeRow };
}

export async function disableReferralCode(
  admin: SupabaseClient,
  codeId: string
): Promise<void> {
  const { error } = await admin
    .from("referral_codes")
    .update({ status: "disabled", updated_at: new Date().toISOString() })
    .eq("id", codeId);
  if (error) throw new Error(error.message);
}
