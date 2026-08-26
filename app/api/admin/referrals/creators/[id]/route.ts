import { NextResponse } from "next/server";
import { resolveOrCreateUserByEmail, isValidEmail } from "@/lib/admin/resolve-or-create-user";
import { logAdminAction, requireAdmin } from "@/lib/referral/admin-auth";
import { disableReferralCode } from "@/lib/referral/codes";
import { ReferralRewardType } from "@/lib/referral/types";
import { getAvailableCreditPence } from "@/lib/referral/credit";

export const dynamic = "force-dynamic";

const CREATOR_REWARD_TYPES = [
  ReferralRewardType.CREATOR_NEW_USER_REWARD,
  ReferralRewardType.CREATOR_LISTING_REWARD,
  ReferralRewardType.CREATOR_TRANSACTION_REWARD,
  ReferralRewardType.CREATOR_COMMISSION,
];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    const { id } = await params;

    const { data: creator, error } = await auth.admin
      .from("creators")
      .select(
        "id, user_id, name, social_handle, social_url, referral_code_id, commission_pence, status, notes, created_at, updated_at, referral_codes(code, status), users:user_id(id, email, account_status, first_name, surname)"
      )
      .eq("id", id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!creator) return NextResponse.json({ error: "Creator not found" }, { status: 404 });

    const codeRel = creator.referral_codes as unknown as
      | { code?: string; status?: string }
      | { code?: string; status?: string }[]
      | null;
    const codeObj = Array.isArray(codeRel) ? codeRel[0] : codeRel;
    const userRel = creator.users as unknown as
      | {
          id?: string;
          email?: string;
          account_status?: string;
          first_name?: string;
          surname?: string;
        }
      | {
          id?: string;
          email?: string;
          account_status?: string;
          first_name?: string;
          surname?: string;
        }[]
      | null;
    const userObj = Array.isArray(userRel) ? userRel[0] : userRel;

    const { data: referrals } = await auth.admin
      .from("referrals")
      .select(
        "id, referred_user_id, attributed_at, created_at, users:referred_user_id(id, email, first_name, surname, display_name)"
      )
      .eq("creator_id", id)
      .order("created_at", { ascending: false });

    const referralIds = (referrals ?? []).map((r) => r.id);
    const { data: rewards } = referralIds.length
      ? await auth.admin
          .from("referral_rewards")
          .select(
            "id, referral_id, reward_type, amount_pence, status, related_transaction_id, related_listing_id, created_at, approved_at, paid_at"
          )
          .in("referral_id", referralIds)
          .in("reward_type", CREATOR_REWARD_TYPES)
          .order("created_at", { ascending: false })
      : { data: [] as {
          id: string;
          referral_id: string;
          reward_type: string;
          amount_pence: number;
          status: string;
          related_transaction_id: string | null;
          related_listing_id: string | null;
          created_at: string;
          approved_at: string | null;
          paid_at: string | null;
        }[] };

    const rewardsByRef = new Map<string, typeof rewards>();
    for (const rw of rewards ?? []) {
      const list = rewardsByRef.get(rw.referral_id) ?? [];
      list.push(rw);
      rewardsByRef.set(rw.referral_id, list);
    }

    const referredUserByRef = new Map<string, { id: string; label: string; email: string | null }>();
    for (const r of referrals ?? []) {
      const u = r.users as unknown as
        | {
            id?: string;
            email?: string;
            first_name?: string;
            surname?: string;
            display_name?: string;
          }
        | {
            id?: string;
            email?: string;
            first_name?: string;
            surname?: string;
            display_name?: string;
          }[]
        | null;
      const user = Array.isArray(u) ? u[0] : u;
      const label =
        user?.display_name ||
        [user?.first_name, user?.surname].filter(Boolean).join(" ") ||
        user?.email ||
        r.referred_user_id.slice(0, 8);
      referredUserByRef.set(r.id, {
        id: r.referred_user_id,
        label,
        email: user?.email ?? null,
      });
    }

    let newUserCount = 0;
    let listingCount = 0;
    let transactionCount = 0;
    let newUserPence = 0;
    let listingPence = 0;
    let transactionPence = 0;
    let legacyCommissionPence = 0;
    let totalCreditPence = 0;

    for (const rw of rewards ?? []) {
      const countable = rw.status === "approved" || rw.status === "paid" || rw.status === "pending";
      if (!countable) continue;
      totalCreditPence += rw.amount_pence;
      if (rw.reward_type === ReferralRewardType.CREATOR_NEW_USER_REWARD) {
        newUserCount += 1;
        newUserPence += rw.amount_pence;
      } else if (rw.reward_type === ReferralRewardType.CREATOR_LISTING_REWARD) {
        listingCount += 1;
        listingPence += rw.amount_pence;
      } else if (rw.reward_type === ReferralRewardType.CREATOR_TRANSACTION_REWARD) {
        transactionCount += 1;
        transactionPence += rw.amount_pence;
      } else if (rw.reward_type === ReferralRewardType.CREATOR_COMMISSION) {
        legacyCommissionPence += rw.amount_pence;
      }
    }

    const availableCreditPence = creator.user_id
      ? await getAvailableCreditPence(auth.admin, creator.user_id)
      : 0;

    return NextResponse.json({
      creator: {
        id: creator.id,
        name: creator.name,
        socialHandle: creator.social_handle,
        socialUrl: creator.social_url,
        code: codeObj?.code ?? null,
        codeStatus: codeObj?.status ?? null,
        status: creator.status,
        notes: creator.notes,
        createdAt: creator.created_at,
        teevoAccountRequired: !creator.user_id,
        user: creator.user_id
          ? {
              id: creator.user_id,
              email: userObj?.email ?? null,
              accountStatus: userObj?.account_status ?? "active",
              firstName: userObj?.first_name ?? null,
              surname: userObj?.surname ?? null,
            }
          : null,
      },
      performance: {
        referredUsers: (referrals ?? []).length,
        successfulListings: listingCount,
        successfulTransactions: transactionCount,
        totalRewardsEarnedPence: totalCreditPence,
        availableCreditPence,
        breakdown: [
          { rewardType: "new_user", qualifyingEvents: newUserCount, earningsPence: newUserPence },
          { rewardType: "listing", qualifyingEvents: listingCount, earningsPence: listingPence },
          {
            rewardType: "transaction",
            qualifyingEvents: transactionCount,
            earningsPence: transactionPence,
          },
          ...(legacyCommissionPence > 0 ||
          (rewards ?? []).some((r) => r.reward_type === ReferralRewardType.CREATOR_COMMISSION)
            ? [
                {
                  rewardType: "legacy_commission",
                  qualifyingEvents: (rewards ?? []).filter(
                    (r) => r.reward_type === ReferralRewardType.CREATOR_COMMISSION
                  ).length,
                  earningsPence: legacyCommissionPence,
                },
              ]
            : []),
        ],
      },
      referredUsers: (referrals ?? []).map((r) => {
        const user = referredUserByRef.get(r.id);
        const rws = rewardsByRef.get(r.id) ?? [];
        const hasSignup = rws.some(
          (rw) => rw.reward_type === ReferralRewardType.CREATOR_NEW_USER_REWARD
        );
        const hasListing = rws.some(
          (rw) => rw.reward_type === ReferralRewardType.CREATOR_LISTING_REWARD
        );
        const hasTx = rws.some(
          (rw) => rw.reward_type === ReferralRewardType.CREATOR_TRANSACTION_REWARD
        );
        const earned = rws
          .filter((rw) => rw.status === "approved" || rw.status === "paid" || rw.status === "pending")
          .reduce((sum, rw) => sum + rw.amount_pence, 0);
        return {
          referralId: r.id,
          userId: r.referred_user_id,
          label: user?.label ?? r.referred_user_id.slice(0, 8),
          email: user?.email ?? null,
          joinedAt: r.attributed_at ?? r.created_at,
          signedUp: true,
          firstListing: hasListing,
          firstTransaction: hasTx,
          signupReward: hasSignup,
          rewardsGeneratedPence: earned,
        };
      }),
      rewardHistory: (rewards ?? []).map((rw) => {
        const user = referredUserByRef.get(rw.referral_id);
        return {
          id: rw.id,
          date: rw.approved_at ?? rw.created_at,
          referredUserId: user?.id ?? null,
          referredUserLabel: user?.label ?? "—",
          rewardType: rw.reward_type,
          amountPence: rw.amount_pence,
          status: rw.status,
          reference: rw.related_transaction_id ?? rw.related_listing_id ?? rw.id,
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

    if (body.linkTeevoAccount || (!existing.user_id && body.email)) {
      const email = (body.email ?? "").trim().toLowerCase();
      if (!email || !isValidEmail(email)) {
        return NextResponse.json({ error: "A valid email is required to link a Teevo account" }, { status: 400 });
      }
      const resolved = await resolveOrCreateUserByEmail(auth.admin, {
        email,
        firstName: (typeof body.name === "string" ? body.name : existing.name).split(/\s+/)[0],
        adminId: auth.user.id,
        sendInvite: true,
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
      await auth.admin
        .from("referral_codes")
        .update({ owner_user_id: resolved.userId, updated_at: new Date().toISOString() })
        .eq("id", existing.referral_code_id);
    }

    const { error } = await auth.admin.from("creators").update(patch).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (body.disableCode || body.status === "disabled") {
      await disableReferralCode(auth.admin, existing.referral_code_id);
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
