import { NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/referral/admin-auth";
import {
  getFounderCampaignSnapshot,
  setFounderCampaignStatus,
} from "@/lib/founder/campaign";
import type { FounderCampaignStatus } from "@/lib/founder/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/founders — campaign overview + founder list
 */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { admin } = auth;

  const snapshot = await getFounderCampaignSnapshot(admin);

  const { data: founders, error } = await admin
    .from("users")
    .select(
      "id, email, display_name, first_name, founding_seller_rank, founder_joined_at, founder_reward_status, founder_reward_earned_at, created_at"
    )
    .not("founding_seller_rank", "is", null)
    .order("founding_seller_rank", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ids = (founders ?? []).map((f) => f.id);
  const referralByUser = new Map<
    string,
    { referrerName: string | null; code: string | null }
  >();

  if (ids.length > 0) {
    const { data: refs } = await admin
      .from("referrals")
      .select("referred_user_id, referrer_user_id, referral_code_id")
      .in("referred_user_id", ids);

    const referrerIds = Array.from(
      new Set((refs ?? []).map((r) => r.referrer_user_id as string))
    );
    const codeIds = Array.from(
      new Set(
        (refs ?? [])
          .map((r) => r.referral_code_id as string | null)
          .filter((id): id is string => Boolean(id))
      )
    );

    const [{ data: referrers }, { data: codes }] = await Promise.all([
      referrerIds.length
        ? admin.from("users").select("id, first_name, display_name").in("id", referrerIds)
        : Promise.resolve({ data: [] as { id: string; first_name: string | null; display_name: string | null }[] }),
      codeIds.length
        ? admin.from("referral_codes").select("id, code").in("id", codeIds)
        : Promise.resolve({ data: [] as { id: string; code: string }[] }),
    ]);

    const referrerMap = new Map((referrers ?? []).map((u) => [u.id, u]));
    const codeMap = new Map((codes ?? []).map((c) => [c.id, c.code]));

    for (const row of refs ?? []) {
      const refUser = referrerMap.get(row.referrer_user_id as string);
      referralByUser.set(row.referred_user_id as string, {
        referrerName:
          refUser?.first_name?.trim() || refUser?.display_name?.trim() || null,
        code: row.referral_code_id ? codeMap.get(row.referral_code_id as string) ?? null : null,
      });
    }
  }

  return NextResponse.json({
    campaign: snapshot,
    founders: (founders ?? []).map((f) => {
      const ref = referralByUser.get(f.id);
      return {
        id: f.id,
        email: f.email,
        displayName: f.display_name,
        firstName: f.first_name,
        founderNumber: f.founding_seller_rank,
        joinedAt: f.founder_joined_at ?? f.created_at,
        rewardStatus: f.founder_reward_status ?? "none",
        rewardEarnedAt: f.founder_reward_earned_at,
        referral: ref ?? null,
      };
    }),
  });
}

/**
 * PATCH /api/admin/founders — pause or resume (cannot raise limit)
 * Body: { status: "active" | "paused" }
 */
export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { admin, user } = auth;

  let body: { status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const status = body.status;
  if (status !== "active" && status !== "paused") {
    return NextResponse.json(
      { error: "status must be active or paused (complete is automatic)" },
      { status: 400 }
    );
  }

  const snapshot = await getFounderCampaignSnapshot(admin);
  if (snapshot.status === "complete" && status === "active") {
    return NextResponse.json(
      { error: "Campaign is complete; cannot resume after all 100 places are allocated." },
      { status: 400 }
    );
  }

  try {
    await setFounderCampaignStatus(admin, status as FounderCampaignStatus);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update status" },
      { status: 400 }
    );
  }

  await logAdminAction(admin, {
    adminId: user.id,
    action: status === "paused" ? "founder_campaign_paused" : "founder_campaign_resumed",
    targetType: "platform_settings",
    targetId: "founder_campaign_status",
  });

  const updated = await getFounderCampaignSnapshot(admin);
  return NextResponse.json({ campaign: updated });
}
