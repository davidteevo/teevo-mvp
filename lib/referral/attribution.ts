import type { SupabaseClient } from "@supabase/supabase-js";
import { lookupReferralCode, type ReferralCodeRow, ensureUserReferralCode } from "@/lib/referral/codes";
import {
  attributionSource,
  decideAttribution,
} from "@/lib/referral/eligibility";
import { getReferralSettings } from "@/lib/referral/settings";
import { trackServerEvent } from "@/lib/starter-pack";

export const REF_COOKIE = "teevo_ref";
export const VISITOR_COOKIE = "teevo_vid";
export const REF_COOKIE_MAX_AGE_SECONDS = 60 * 24 * 60 * 60; // 60 days

export function referralCookieOptions(): {
  maxAge: number;
  sameSite: "lax";
  path: string;
  domain?: string;
} {
  const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;
  return {
    maxAge: REF_COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax",
    path: "/",
    ...(domain ? { domain } : {}),
  };
}

export type ReferralRow = {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  referral_code_id: string | null;
  creator_id: string | null;
  source: string;
};

export async function getReferralForUser(
  admin: SupabaseClient,
  userId: string
): Promise<ReferralRow | null> {
  const { data } = await admin
    .from("referrals")
    .select("id, referrer_user_id, referred_user_id, referral_code_id, creator_id, source")
    .eq("referred_user_id", userId)
    .maybeSingle();
  return (data as ReferralRow | null) ?? null;
}

async function loadCreatorForCode(
  admin: SupabaseClient,
  code: ReferralCodeRow
): Promise<{ id: string; status: "active" | "paused" | "disabled"; user_id: string | null } | null> {
  if (code.kind !== "creator") return null;
  const { data } = await admin
    .from("creators")
    .select("id, status, user_id")
    .eq("referral_code_id", code.id)
    .maybeSingle();
  return data
    ? {
        id: data.id as string,
        status: data.status as "active" | "paused" | "disabled",
        user_id: (data.user_id as string | null) ?? null,
      }
    : null;
}

/**
 * Persist first-wins referral attribution after a new account is created.
 * Never throws.
 */
export async function persistReferralAttribution(
  admin: SupabaseClient,
  opts: {
    referredUserId: string;
    referredEmail?: string | null;
    rawCode: string | null | undefined;
    via: "url" | "code";
  }
): Promise<ReferralRow | null> {
  try {
    const code = await lookupReferralCode(admin, opts.rawCode ?? "");
    if (!code) return null;

    const existing = await getReferralForUser(admin, opts.referredUserId);
    const creator = await loadCreatorForCode(admin, code);
    const settings = await getReferralSettings(admin);
    const ownerId = code.owner_user_id || creator?.user_id || null;

    const decision = decideAttribution({
      alreadyAttributed: !!existing,
      actorUserId: opts.referredUserId,
      codeOwnerUserId: ownerId,
      codeStatus: code.status,
      codeKind: code.kind,
      creatorStatus: creator?.status ?? null,
      programmeEnabled: settings.programmeEnabled,
      creatorProgrammeEnabled: settings.creatorEnabled,
    });
    if (!decision.accept || !ownerId) return existing;

    const { data: owner } = await admin.from("users").select("email").eq("id", ownerId).maybeSingle();
    const referredEmail = (opts.referredEmail ?? "").trim().toLowerCase();
    const ownerEmail = (owner?.email ?? "").trim().toLowerCase();
    if (referredEmail && ownerEmail && referredEmail === ownerEmail) {
      return null;
    }

    const source = attributionSource({ kind: code.kind, via: opts.via });
    const { data, error } = await admin
      .from("referrals")
      .insert({
        referrer_user_id: ownerId,
        referred_user_id: opts.referredUserId,
        referral_code_id: code.id,
        creator_id: code.kind === "creator" ? creator?.id ?? null : null,
        source,
        attributed_at: new Date().toISOString(),
      })
      .select("id, referrer_user_id, referred_user_id, referral_code_id, creator_id, source")
      .maybeSingle();

    if (error) {
      if (/duplicate|unique/i.test(error.message)) {
        return getReferralForUser(admin, opts.referredUserId);
      }
      console.error("persistReferralAttribution insert failed", error);
      return null;
    }

    await trackServerEvent(admin, "referral_signup_completed", {
      userId: opts.referredUserId,
      properties: {
        referral_id: data?.id,
        referrer_user_id: ownerId,
        code: code.code,
        source,
        creator_id: code.kind === "creator" ? creator?.id ?? null : null,
      },
    });

    return (data as ReferralRow | null) ?? null;
  } catch (e) {
    console.error("persistReferralAttribution failed", e);
    return null;
  }
}

export async function provisionNewUserReferral(
  admin: SupabaseClient,
  opts: {
    userId: string;
    firstName?: string | null;
    email?: string | null;
    rawCode?: string | null;
    via?: "url" | "code";
  }
): Promise<void> {
  try {
    await ensureUserReferralCode(admin, { userId: opts.userId, firstName: opts.firstName });
    if (opts.rawCode) {
      await persistReferralAttribution(admin, {
        referredUserId: opts.userId,
        referredEmail: opts.email,
        rawCode: opts.rawCode,
        via: opts.via ?? "url",
      });
    }
  } catch (e) {
    console.error("provisionNewUserReferral failed", e);
  }
}

export async function recordReferralVisit(
  admin: SupabaseClient,
  opts: { codeId: string; visitorKey: string; landingPath?: string | null }
): Promise<void> {
  try {
    const { error } = await admin.from("referral_visits").insert({
      referral_code_id: opts.codeId,
      visitor_key: opts.visitorKey,
      landing_path: opts.landingPath ?? "/",
    });
    if (error && !/duplicate|unique/i.test(error.message)) {
      console.error("recordReferralVisit failed", error);
    }
  } catch (e) {
    console.error("recordReferralVisit failed", e);
  }
}
