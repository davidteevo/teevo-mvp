import { NextResponse } from "next/server";
import { getReferralSettings } from "@/lib/referral/settings";
import { createCreatorReferralCode, lookupReferralCode } from "@/lib/referral/codes";
import { logAdminAction, requireAdmin } from "@/lib/referral/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    const { data, error } = await auth.admin
      .from("creators")
      .select(
        "id, user_id, name, social_handle, social_url, referral_code_id, commission_pence, status, notes, created_at, referral_codes(code, status)"
      )
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const creators = data ?? [];
    const ids = creators.map((c) => c.id);
    const { data: referrals } = ids.length
      ? await auth.admin.from("referrals").select("id, creator_id").in("creator_id", ids)
      : { data: [] as { id: string; creator_id: string }[] };
    const referralIds = (referrals ?? []).map((r) => r.id);
    const { data: rewards } = referralIds.length
      ? await auth.admin
          .from("referral_rewards")
          .select("referral_id, status, amount_pence, reward_type")
          .eq("reward_type", "creator_commission")
          .in("referral_id", referralIds)
      : { data: [] as { referral_id: string; status: string; amount_pence: number }[] };

    const refByCreator = new Map<string, string[]>();
    for (const r of referrals ?? []) {
      const list = refByCreator.get(r.creator_id) ?? [];
      list.push(r.id);
      refByCreator.set(r.creator_id, list);
    }
    const rewardByRef = new Map((rewards ?? []).map((rw) => [rw.referral_id, rw]));

    const { data: visits } = creators.length
      ? await auth.admin
          .from("referral_visits")
          .select("referral_code_id")
          .in(
            "referral_code_id",
            creators.map((c) => c.referral_code_id)
          )
      : { data: [] as { referral_code_id: string }[] };
    const visitCounts = new Map<string, number>();
    for (const v of visits ?? []) {
      visitCounts.set(v.referral_code_id, (visitCounts.get(v.referral_code_id) ?? 0) + 1);
    }

    return NextResponse.json({
      creators: creators.map((c) => {
        const codeRel = c.referral_codes as unknown as { code?: string; status?: string } | { code?: string; status?: string }[] | null;
        const codeObj = Array.isArray(codeRel) ? codeRel[0] : codeRel;
        const refIds = refByCreator.get(c.id) ?? [];
        let pending = 0;
        let approved = 0;
        let paid = 0;
        let cancelled = 0;
        let conversions = 0;
        for (const rid of refIds) {
          const rw = rewardByRef.get(rid);
          if (!rw) continue;
          conversions += 1;
          if (rw.status === "pending") pending += rw.amount_pence;
          if (rw.status === "approved") approved += rw.amount_pence;
          if (rw.status === "paid") paid += rw.amount_pence;
          if (rw.status === "cancelled" || rw.status === "reversed") cancelled += 1;
        }
        return {
          id: c.id,
          userId: c.user_id,
          name: c.name,
          socialHandle: c.social_handle,
          socialUrl: c.social_url,
          code: codeObj?.code ?? null,
          codeStatus: codeObj?.status ?? null,
          commissionPence: c.commission_pence,
          status: c.status,
          notes: c.notes,
          createdAt: c.created_at,
          visits: visitCounts.get(c.referral_code_id) ?? 0,
          signups: refIds.length,
          conversions,
          pendingPence: pending,
          approvedPence: approved,
          paidPence: paid,
          cancelledCount: cancelled,
        };
      }),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    let body: {
      name?: string;
      userId?: string | null;
      socialHandle?: string | null;
      socialUrl?: string | null;
      code?: string;
      commissionPence?: number;
      notes?: string | null;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const name = (body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Creator name is required" }, { status: 400 });
    const settings = await getReferralSettings(auth.admin);
    const commission =
      typeof body.commissionPence === "number" ? body.commissionPence : settings.creatorDefaultCommissionPence;
    if (!Number.isInteger(commission) || commission < 0) {
      return NextResponse.json({ error: "Commission must be a non-negative integer (pence)" }, { status: 400 });
    }

    const codeInput = (body.code ?? name).replace(/\s+/g, "");
    const existing = await lookupReferralCode(auth.admin, codeInput);
    if (existing) return NextResponse.json({ error: "That code is already in use." }, { status: 400 });
    const created = await createCreatorReferralCode(auth.admin, {
      code: codeInput,
      ownerUserId: body.userId ?? null,
    });
    if (!created.ok) return NextResponse.json({ error: created.error }, { status: 400 });

    const { data, error } = await auth.admin
      .from("creators")
      .insert({
        name,
        user_id: body.userId || null,
        social_handle: body.socialHandle || null,
        social_url: body.socialUrl || null,
        referral_code_id: created.row.id,
        commission_pence: commission,
        status: "active",
        notes: body.notes || null,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Could not create creator" }, { status: 500 });
    }
    await logAdminAction(auth.admin, {
      adminId: auth.user.id,
      action: "create_creator",
      targetType: "creator",
      targetId: data.id,
      payload: { name, code: created.row.code, commission_pence: commission },
    });
    return NextResponse.json({ id: data.id, code: created.row.code });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
