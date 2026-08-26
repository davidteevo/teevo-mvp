import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { ensureUserReferralCode, referralShareUrl } from "@/lib/referral/codes";
import { getAvailableCreditPence } from "@/lib/referral/credit";
import { getReferralSettings } from "@/lib/referral/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("first_name")
    .eq("id", user.id)
    .maybeSingle();
  const codeRow = await ensureUserReferralCode(admin, {
    userId: user.id,
    firstName: profile?.first_name,
  });
  const settings = await getReferralSettings(admin);
  const creditPence = await getAvailableCreditPence(admin, user.id);

  const { count: friendsJoined } = await admin
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_user_id", user.id);

  const { data: referralIds } = await admin
    .from("referrals")
    .select("id")
    .eq("referrer_user_id", user.id);
  const ids = (referralIds ?? []).map((r) => r.id);

  let rewards: {
    id: string;
    reward_type: string;
    amount_pence: number;
    status: string;
    created_at: string;
  }[] = [];
  let successful = 0;
  let pendingPence = 0;
  let earnedPence = 0;

  if (ids.length > 0) {
    const { data: rewardRows } = await admin
      .from("referral_rewards")
      .select("id, reward_type, amount_pence, status, created_at")
      .in("referral_id", ids)
      .not(
        "reward_type",
        "in",
        "(creator_commission,creator_new_user_reward,creator_listing_reward,creator_transaction_reward)"
      )
      .order("created_at", { ascending: false });
    rewards = rewardRows ?? [];
    for (const r of rewards) {
      if (r.status === "approved" || r.status === "paid") {
        successful += 1;
        earnedPence += r.amount_pence;
      }
      if (r.status === "pending") pendingPence += r.amount_pence;
    }
  }

  return NextResponse.json({
    programmeEnabled: settings.programmeEnabled,
    referralPriority: settings.referralPriority,
    discountPence: settings.discountPence,
    referrerRewardPence: settings.referrerRewardPence,
    sellerListingRewardPence: settings.sellerListingRewardPence,
    code: codeRow?.code ?? null,
    url: codeRow ? referralShareUrl(codeRow.code) : null,
    codeDisabled: codeRow?.status === "disabled",
    creditPence,
    friendsJoined: friendsJoined ?? 0,
    successfulReferrals: successful,
    pendingPence,
    earnedPence,
    rewards: rewards.map((r) => ({
      id: r.id,
      amountPence: r.amount_pence,
      status: r.status,
      createdAt: r.created_at,
    })),
  });
}
