import { NextResponse } from "next/server";
import { resolveOrCreateUserByEmail, isValidEmail } from "@/lib/admin/resolve-or-create-user";
import { createCreatorReferralCode, lookupReferralCode } from "@/lib/referral/codes";
import { logAdminAction, requireAdmin } from "@/lib/referral/admin-auth";
import { ReferralRewardType } from "@/lib/referral/types";

export const dynamic = "force-dynamic";

const MILESTONE_TYPES = new Set([
  ReferralRewardType.CREATOR_NEW_USER_REWARD,
  ReferralRewardType.CREATOR_LISTING_REWARD,
  ReferralRewardType.CREATOR_TRANSACTION_REWARD,
  ReferralRewardType.CREATOR_COMMISSION,
]);

export async function GET() {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    const { data, error } = await auth.admin
      .from("creators")
      .select(
        "id, user_id, name, social_handle, social_url, referral_code_id, commission_pence, status, notes, created_at, referral_codes(code, status), users:user_id(email, account_status)"
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
          .in("referral_id", referralIds)
          .in("reward_type", Array.from(MILESTONE_TYPES))
      : { data: [] as { referral_id: string; status: string; amount_pence: number; reward_type: string }[] };

    const refByCreator = new Map<string, string[]>();
    for (const r of referrals ?? []) {
      const list = refByCreator.get(r.creator_id) ?? [];
      list.push(r.id);
      refByCreator.set(r.creator_id, list);
    }

    const rewardsByRef = new Map<string, { status: string; amount_pence: number; reward_type: string }[]>();
    for (const rw of rewards ?? []) {
      const list = rewardsByRef.get(rw.referral_id) ?? [];
      list.push(rw);
      rewardsByRef.set(rw.referral_id, list);
    }

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
        const codeRel = c.referral_codes as unknown as
          | { code?: string; status?: string }
          | { code?: string; status?: string }[]
          | null;
        const codeObj = Array.isArray(codeRel) ? codeRel[0] : codeRel;
        const userRel = c.users as unknown as
          | { email?: string; account_status?: string }
          | { email?: string; account_status?: string }[]
          | null;
        const userObj = Array.isArray(userRel) ? userRel[0] : userRel;
        const refIds = refByCreator.get(c.id) ?? [];
        let creditEarned = 0;
        let listingRewards = 0;
        let transactionRewards = 0;
        let newUserRewards = 0;
        for (const rid of refIds) {
          for (const rw of rewardsByRef.get(rid) ?? []) {
            const countable =
              rw.status === "approved" || rw.status === "paid" || rw.status === "pending";
            if (countable) creditEarned += rw.amount_pence;
            if (rw.reward_type === ReferralRewardType.CREATOR_LISTING_REWARD) listingRewards += 1;
            if (rw.reward_type === ReferralRewardType.CREATOR_TRANSACTION_REWARD) {
              transactionRewards += 1;
            }
            if (rw.reward_type === ReferralRewardType.CREATOR_NEW_USER_REWARD) newUserRewards += 1;
          }
        }
        return {
          id: c.id,
          userId: c.user_id,
          email: userObj?.email ?? null,
          accountStatus: userObj?.account_status ?? null,
          teevoAccountRequired: !c.user_id,
          name: c.name,
          socialHandle: c.social_handle,
          socialUrl: c.social_url,
          code: codeObj?.code ?? null,
          codeStatus: codeObj?.status ?? null,
          status: c.status,
          notes: c.notes,
          createdAt: c.created_at,
          visits: visitCounts.get(c.referral_code_id) ?? 0,
          signups: refIds.length,
          newUserRewards,
          listingRewards,
          transactionRewards,
          creditEarnedPence: creditEarned,
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
      email?: string;
      socialHandle?: string | null;
      socialUrl?: string | null;
      socialPlatform?: string | null;
      code?: string;
      notes?: string | null;
      status?: "active" | "paused" | "disabled";
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const name = (body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Creator name is required" }, { status: 400 });
    const email = (body.email ?? "").trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const resolved = await resolveOrCreateUserByEmail(auth.admin, {
      email,
      firstName: name.split(/\s+/)[0] ?? name,
      surname: name.split(/\s+/).slice(1).join(" ") || null,
      adminId: auth.user.id,
      adminNotes: body.notes ?? null,
      sendInvite: true,
    });
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const { data: existingCreator } = await auth.admin
      .from("creators")
      .select("id")
      .eq("user_id", resolved.userId)
      .maybeSingle();
    if (existingCreator) {
      return NextResponse.json(
        { error: "This Teevo user is already registered as a creator." },
        { status: 409 }
      );
    }

    const codeInput = (body.code ?? name).replace(/\s+/g, "");
    const existing = await lookupReferralCode(auth.admin, codeInput);
    if (existing) return NextResponse.json({ error: "That code is already in use." }, { status: 400 });
    const created = await createCreatorReferralCode(auth.admin, {
      code: codeInput,
      ownerUserId: resolved.userId,
    });
    if (!created.ok) return NextResponse.json({ error: created.error }, { status: 400 });

    const socialHandle =
      body.socialHandle ||
      (body.socialPlatform ? `${body.socialPlatform}` : null) ||
      null;

    const status =
      body.status === "paused" || body.status === "disabled" ? body.status : "active";

    const { data, error } = await auth.admin
      .from("creators")
      .insert({
        name,
        user_id: resolved.userId,
        social_handle: socialHandle,
        social_url: body.socialUrl || null,
        referral_code_id: created.row.id,
        commission_pence: 0,
        status,
        notes: body.notes || null,
        updated_at: new Date().toISOString(),
      })
      .select("id, status")
      .single();
    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Could not create creator" }, { status: 500 });
    }
    await logAdminAction(auth.admin, {
      adminId: auth.user.id,
      action: "create_creator",
      targetType: "creator",
      targetId: data.id,
      payload: {
        name,
        code: created.row.code,
        user_id: resolved.userId,
        linked_existing: resolved.linkedExisting,
      },
    });
    return NextResponse.json({
      id: data.id,
      name,
      code: created.row.code,
      userId: resolved.userId,
      email: resolved.email,
      accountStatus: resolved.accountStatus,
      linkedExisting: resolved.linkedExisting,
      invited: resolved.invited,
      warning: resolved.warning,
      message: resolved.linkedExisting
        ? "Existing Teevo user found. This creator will be linked to that account."
        : "Creator created successfully",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
