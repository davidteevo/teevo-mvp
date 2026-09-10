import { NextResponse } from "next/server";
import { resolveOrCreateUserByEmail, isValidEmail } from "@/lib/admin/resolve-or-create-user";
import {
  getCreatorAdminInsights,
  parseCreatorInsightsRange,
} from "@/lib/creator/admin-insights";
import { sendCreatorOnboardingEmail } from "@/lib/creator/onboarding-email";
import { logAdminAction, requireAdmin } from "@/lib/referral/admin-auth";
import { disableReferralCode, enableReferralCode } from "@/lib/referral/codes";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const range = parseCreatorInsightsRange({
      preset: searchParams.get("preset") ?? "all",
      from: searchParams.get("from"),
      to: searchParams.get("to"),
    });

    const insights = await getCreatorAdminInsights(auth.admin, id, range);
    if (!insights) return NextResponse.json({ error: "Creator not found" }, { status: 404 });

    // Preserve legacy shape used by Admin Creators detail page, plus full insights.
    return NextResponse.json({
      creator: insights.creator,
      performance: insights.performance,
      referredUsers: insights.referredUsers,
      rewardHistory: insights.rewardHistory,
      programme: insights.programme,
      performanceInRange: insights.performanceInRange,
      funnel: insights.funnel,
      trend: insights.trend,
      attributedListings: insights.attributedListings,
      attributedTransactions: insights.attributedTransactions,
      auditTrail: insights.auditTrail,
      range: insights.range,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    const { id } = await params;
    let body: {
      name?: string;
      email?: string;
      socialHandle?: string | null;
      socialUrl?: string | null;
      commissionPence?: number;
      status?: "active" | "paused" | "disabled";
      notes?: string | null;
      disableCode?: boolean;
      linkTeevoAccount?: boolean;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { data: existing } = await auth.admin
      .from("creators")
      .select("id, referral_code_id, status, user_id, name")
      .eq("id", id)
      .maybeSingle();
    if (!existing) return NextResponse.json({ error: "Creator not found" }, { status: 404 });

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
    if (body.socialHandle !== undefined) patch.social_handle = body.socialHandle || null;
    if (body.socialUrl !== undefined) patch.social_url = body.socialUrl || null;
    if (typeof body.commissionPence === "number") {
      if (!Number.isInteger(body.commissionPence) || body.commissionPence < 0) {
        return NextResponse.json({ error: "Commission must be a non-negative integer (pence)" }, { status: 400 });
      }
      patch.commission_pence = body.commissionPence;
    }
    if (body.status === "active" || body.status === "paused" || body.status === "disabled") {
      patch.status = body.status;
    }
    if (body.notes !== undefined) patch.notes = body.notes;

    let linkedResolved: Awaited<ReturnType<typeof resolveOrCreateUserByEmail>> | null = null;
    const linkingAccount = Boolean(body.linkTeevoAccount || (!existing.user_id && body.email));

    if (linkingAccount) {
      const email = (body.email ?? "").trim().toLowerCase();
      if (!email || !isValidEmail(email)) {
        return NextResponse.json({ error: "A valid email is required to link a Teevo account" }, { status: 400 });
      }
      const resolved = await resolveOrCreateUserByEmail(auth.admin, {
        email,
        firstName: (typeof body.name === "string" ? body.name : existing.name).split(/\s+/)[0],
        adminId: auth.user.id,
        sendInvite: false,
      });
      if (!resolved.ok) {
        return NextResponse.json({ error: resolved.error }, { status: resolved.status });
      }
      const { data: other } = await auth.admin
        .from("creators")
        .select("id")
        .eq("user_id", resolved.userId)
        .neq("id", id)
        .maybeSingle();
      if (other) {
        return NextResponse.json(
          { error: "This Teevo user is already registered as a creator." },
          { status: 409 }
        );
      }
      patch.user_id = resolved.userId;
      linkedResolved = resolved;
      await auth.admin
        .from("referral_codes")
        .update({ owner_user_id: resolved.userId, updated_at: new Date().toISOString() })
        .eq("id", existing.referral_code_id);
    }

    const { error } = await auth.admin.from("creators").update(patch).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (body.disableCode || body.status === "disabled") {
      await disableReferralCode(auth.admin, existing.referral_code_id);
    } else if (body.status === "active") {
      await enableReferralCode(auth.admin, existing.referral_code_id);
    }

    // First-time link only (was unlinked → now has user_id).
    if (linkingAccount && !existing.user_id && linkedResolved && linkedResolved.ok) {
      try {
        const { data: codeRow } = await auth.admin
          .from("referral_codes")
          .select("code")
          .eq("id", existing.referral_code_id)
          .maybeSingle();
        await sendCreatorOnboardingEmail(auth.admin, {
          creatorId: id,
          userId: linkedResolved.userId,
          email: linkedResolved.email,
          firstName: (typeof body.name === "string" ? body.name : existing.name).split(/\s+/)[0],
          referralCode: codeRow?.code ?? null,
          kind: linkedResolved.linkedExisting ? "existing" : "new",
          accountActivationUrl: linkedResolved.activationUrl ?? null,
        });
      } catch (e) {
        console.error("creator onboarding email failed after link", e);
      }
    }

    await logAdminAction(auth.admin, {
      adminId: auth.user.id,
      action: "update_creator",
      targetType: "creator",
      targetId: id,
      payload: body as Record<string, unknown>,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
