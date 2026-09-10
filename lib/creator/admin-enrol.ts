/**
 * Shared admin helpers for enrolling / reactivating / removing creators.
 * Used by Admin → Creators and Admin → Users → Creator tab.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendCreatorOnboardingEmail } from "@/lib/creator/onboarding-email";
import { logAdminAction } from "@/lib/referral/admin-auth";
import {
  createCreatorReferralCode,
  disableReferralCode,
  enableReferralCode,
  lookupReferralCode,
  normalizeReferralCode,
} from "@/lib/referral/codes";

export type CreatorProgrammeStatus = "active" | "paused" | "disabled";

export type EnrolUserAsCreatorResult =
  | {
      ok: true;
      creatorId: string;
      code: string;
      reactivated: boolean;
      onboardingEmail: Awaited<ReturnType<typeof sendCreatorOnboardingEmail>> | null;
      warning?: string;
    }
  | { ok: false; error: string; status: number };

function displayNameFromUser(user: {
  first_name?: string | null;
  surname?: string | null;
  display_name?: string | null;
  email?: string | null;
}): string {
  const fromParts = [user.first_name, user.surname].filter(Boolean).join(" ").trim();
  if (fromParts) return fromParts;
  if (user.display_name?.trim()) return user.display_name.trim();
  if (user.email) return user.email.split("@")[0] ?? "Creator";
  return "Creator";
}

function defaultCodeFromName(name: string): string {
  return name.replace(/\s+/g, "");
}

/**
 * Enrol an existing Teevo user as a creator, or reactivate a former creator row.
 * Does not create a duplicate user account.
 */
export async function enrolUserAsCreator(
  admin: SupabaseClient,
  opts: {
    userId: string;
    adminId: string;
    name?: string | null;
    code?: string | null;
    socialHandle?: string | null;
    socialUrl?: string | null;
    notes?: string | null;
    /** When true, send onboarding email (default true). */
    sendOnboardingEmail?: boolean;
  }
): Promise<EnrolUserAsCreatorResult> {
  const { data: user, error: userError } = await admin
    .from("users")
    .select("id, email, first_name, surname, display_name")
    .eq("id", opts.userId)
    .maybeSingle();
  if (userError) return { ok: false, error: userError.message, status: 500 };
  if (!user) return { ok: false, error: "User not found", status: 404 };
  if (!user.email) return { ok: false, error: "User has no email", status: 400 };

  const { data: existing } = await admin
    .from("creators")
    .select("id, status, referral_code_id, name")
    .eq("user_id", opts.userId)
    .maybeSingle();

  if (existing) {
    if (existing.status === "active") {
      return {
        ok: false,
        error: "This Teevo user is already registered as a creator.",
        status: 409,
      };
    }
    // Reactivate existing creator identity — preserve id, referrals, rewards.
    const { error: updateError } = await admin
      .from("creators")
      .update({
        status: "active",
        updated_at: new Date().toISOString(),
        ...(opts.name?.trim() ? { name: opts.name.trim() } : {}),
        ...(opts.notes !== undefined ? { notes: opts.notes } : {}),
      })
      .eq("id", existing.id);
    if (updateError) return { ok: false, error: updateError.message, status: 500 };

    await enableReferralCode(admin, existing.referral_code_id);

    const { data: codeRow } = await admin
      .from("referral_codes")
      .select("code")
      .eq("id", existing.referral_code_id)
      .maybeSingle();

    let onboardingEmail: Awaited<ReturnType<typeof sendCreatorOnboardingEmail>> | null = null;
    if (opts.sendOnboardingEmail !== false) {
      try {
        onboardingEmail = await sendCreatorOnboardingEmail(admin, {
          creatorId: existing.id,
          userId: opts.userId,
          email: user.email,
          firstName: user.first_name ?? displayNameFromUser(user).split(/\s+/)[0],
          referralCode: codeRow?.code ?? null,
          kind: "existing",
          accountActivationUrl: null,
        });
      } catch (e) {
        console.error("creator onboarding email failed after reactivate", e);
      }
    }

    await logAdminAction(admin, {
      adminId: opts.adminId,
      action: "reactivate_creator",
      targetType: "creator",
      targetId: existing.id,
      payload: {
        user_id: opts.userId,
        previous_status: existing.status,
        onboarding_email: onboardingEmail,
      },
    });

    return {
      ok: true,
      creatorId: existing.id,
      code: codeRow?.code ?? "",
      reactivated: true,
      onboardingEmail,
      warning:
        onboardingEmail && !onboardingEmail.sent
          ? "Creator reactivated but onboarding email did not send."
          : undefined,
    };
  }

  const name = (opts.name?.trim() || displayNameFromUser(user)).trim();
  const codeInput = normalizeReferralCode(opts.code ?? defaultCodeFromName(name));
  if (!codeInput) {
    return { ok: false, error: "Could not derive a referral code", status: 400 };
  }
  const existingCode = await lookupReferralCode(admin, codeInput);
  if (existingCode) {
    return { ok: false, error: "That code is already in use.", status: 400 };
  }
  const created = await createCreatorReferralCode(admin, {
    code: codeInput,
    ownerUserId: opts.userId,
  });
  if (!created.ok) return { ok: false, error: created.error, status: 400 };

  const { data, error } = await admin
    .from("creators")
    .insert({
      name,
      user_id: opts.userId,
      social_handle: opts.socialHandle || null,
      social_url: opts.socialUrl || null,
      referral_code_id: created.row.id,
      commission_pence: 0,
      status: "active",
      notes: opts.notes || null,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not create creator", status: 500 };
  }

  let onboardingEmail: Awaited<ReturnType<typeof sendCreatorOnboardingEmail>> | null = null;
  if (opts.sendOnboardingEmail !== false) {
    try {
      onboardingEmail = await sendCreatorOnboardingEmail(admin, {
        creatorId: data.id,
        userId: opts.userId,
        email: user.email,
        firstName: user.first_name ?? name.split(/\s+/)[0] ?? name,
        referralCode: created.row.code,
        kind: "existing",
        accountActivationUrl: null,
      });
    } catch (e) {
      console.error("creator onboarding email failed after enrol", e);
    }
  }

  await logAdminAction(admin, {
    adminId: opts.adminId,
    action: "create_creator",
    targetType: "creator",
    targetId: data.id,
    payload: {
      name,
      code: created.row.code,
      user_id: opts.userId,
      linked_existing: true,
      source: "admin_user_enrol",
      onboarding_email: onboardingEmail,
    },
  });

  return {
    ok: true,
    creatorId: data.id,
    code: created.row.code,
    reactivated: false,
    onboardingEmail,
    warning:
      onboardingEmail && !onboardingEmail.sent
        ? "Creator created but onboarding email did not send."
        : undefined,
  };
}

/**
 * Update creator programme status. Disabling kills the referral code;
 * activating re-enables it.
 */
export async function setCreatorProgrammeStatus(
  admin: SupabaseClient,
  opts: {
    creatorId: string;
    status: CreatorProgrammeStatus;
    adminId: string;
    notes?: string | null;
  }
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const { data: existing } = await admin
    .from("creators")
    .select("id, referral_code_id, status")
    .eq("id", opts.creatorId)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Creator not found", status: 404 };

  const { error } = await admin
    .from("creators")
    .update({
      status: opts.status,
      updated_at: new Date().toISOString(),
      ...(opts.notes !== undefined ? { notes: opts.notes } : {}),
    })
    .eq("id", opts.creatorId);
  if (error) return { ok: false, error: error.message, status: 500 };

  if (opts.status === "disabled") {
    await disableReferralCode(admin, existing.referral_code_id);
  } else if (opts.status === "active") {
    await enableReferralCode(admin, existing.referral_code_id);
  }

  await logAdminAction(admin, {
    adminId: opts.adminId,
    action: opts.status === "disabled" ? "remove_creator" : "update_creator",
    targetType: "creator",
    targetId: opts.creatorId,
    payload: {
      previous_status: existing.status,
      status: opts.status,
    },
  });

  return { ok: true };
}
