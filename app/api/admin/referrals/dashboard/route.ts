import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/referral/admin-auth";

export const dynamic = "force-dynamic";

function parseRange(request: Request): { from: string | null; to: string | null } {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  return {
    from: from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? `${from}T00:00:00.000Z` : null,
    to: to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? `${to}T23:59:59.999Z` : null,
  };
}

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    const admin = auth.admin;
    const { from, to } = parseRange(request);

    let referralsQuery = admin.from("referrals").select("id, referrer_user_id, referred_user_id, creator_id, created_at");
    if (from) referralsQuery = referralsQuery.gte("created_at", from);
    if (to) referralsQuery = referralsQuery.lte("created_at", to);
    const { data: referrals } = await referralsQuery;
    const referralRows = referrals ?? [];
    const referredIds = referralRows.map((r) => r.referred_user_id);
    const referralIds = referralRows.map((r) => r.id);

    const { data: rewards } = referralIds.length
      ? await admin
          .from("referral_rewards")
          .select("id, referral_id, reward_type, amount_pence, status")
          .in("referral_id", referralIds)
      : { data: [] as { id: string; referral_id: string; reward_type: string; amount_pence: number; status: string }[] };

    const rewardRows = rewards ?? [];
    const successfulBuyers = new Set(
      rewardRows
        .filter(
          (r) =>
            (r.reward_type === "buyer_referrer_credit" || r.reward_type === "creator_commission") &&
            (r.status === "approved" || r.status === "paid")
        )
        .map((r) => r.referral_id)
    ).size;
    const sellerListing = rewardRows.filter(
      (r) => r.reward_type === "seller_listing_credit" && (r.status === "approved" || r.status === "paid")
    ).length;
    const sellerSale = rewardRows.filter(
      (r) => r.reward_type === "seller_sale_credit" && (r.status === "approved" || r.status === "paid")
    ).length;

    let creditIssued = 0;
    let creditRedeemed = 0;
    let pendingLiability = 0;
    let creatorPending = 0;
    let creatorPaid = 0;
    for (const r of rewardRows) {
      if (r.reward_type === "creator_commission") {
        if (r.status === "pending" || r.status === "approved") creatorPending += r.amount_pence;
        if (r.status === "paid") creatorPaid += r.amount_pence;
        continue;
      }
      if (r.status === "pending") pendingLiability += r.amount_pence;
      if (r.status === "approved" || r.status === "paid") creditIssued += r.amount_pence;
    }

    const { data: redemptions } = await admin
      .from("credit_transactions")
      .select("amount_pence")
      .eq("type", "redemption")
      .eq("status", "redeemed");
    creditRedeemed = Math.abs((redemptions ?? []).reduce((s, row) => s + row.amount_pence, 0));

    let discountsIssued = 0;
    let gmv = 0;
    if (referredIds.length > 0) {
      let txQuery = admin
        .from("transactions")
        .select("amount, referral_discount_pence, buyer_id, status")
        .in("buyer_id", referredIds)
        .neq("status", "refunded");
      if (from) txQuery = txQuery.gte("created_at", from);
      if (to) txQuery = txQuery.lte("created_at", to);
      const { data: txs } = await txQuery;
      for (const tx of txs ?? []) {
        gmv += tx.amount ?? 0;
        discountsIssued += tx.referral_discount_pence ?? 0;
      }
    }

    const referrerCounts = new Map<string, number>();
    for (const r of referralRows) {
      referrerCounts.set(r.referrer_user_id, (referrerCounts.get(r.referrer_user_id) ?? 0) + 1);
    }
    const topReferrerIds = Array.from(referrerCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const { data: referrerUsers } = topReferrerIds.length
      ? await admin
          .from("users")
          .select("id, display_name, email, first_name")
          .in(
            "id",
            topReferrerIds.map(([id]) => id)
          )
      : { data: [] as { id: string; display_name: string | null; email: string; first_name: string | null }[] };
    const userMap = new Map((referrerUsers ?? []).map((u) => [u.id, u]));
    const topReferrers = topReferrerIds.map(([id, count]) => {
      const u = userMap.get(id);
      return {
        userId: id,
        name: u?.display_name || u?.first_name || u?.email || id.slice(0, 8),
        referredCount: count,
      };
    });

    const creatorCounts = new Map<string, { signups: number; conversions: number }>();
    for (const r of referralRows) {
      if (!r.creator_id) continue;
      const cur = creatorCounts.get(r.creator_id) ?? { signups: 0, conversions: 0 };
      cur.signups += 1;
      creatorCounts.set(r.creator_id, cur);
    }
    for (const rw of rewardRows) {
      if (rw.reward_type !== "creator_commission") continue;
      if (rw.status !== "approved" && rw.status !== "paid") continue;
      const ref = referralRows.find((r) => r.id === rw.referral_id);
      if (!ref?.creator_id) continue;
      const cur = creatorCounts.get(ref.creator_id) ?? { signups: 0, conversions: 0 };
      cur.conversions += 1;
      creatorCounts.set(ref.creator_id, cur);
    }
    const topCreatorIds = Array.from(creatorCounts.entries())
      .sort((a, b) => b[1].conversions - a[1].conversions)
      .slice(0, 10);
    const { data: creatorRows } = topCreatorIds.length
      ? await admin
          .from("creators")
          .select("id, name")
          .in(
            "id",
            topCreatorIds.map(([id]) => id)
          )
      : { data: [] as { id: string; name: string }[] };
    const creatorMap = new Map((creatorRows ?? []).map((c) => [c.id, c.name]));
    const topCreators = topCreatorIds.map(([id, stats]) => ({
      creatorId: id,
      name: creatorMap.get(id) ?? id.slice(0, 8),
      signups: stats.signups,
      conversions: stats.conversions,
    }));

    return NextResponse.json({
      totalReferredUsers: referralRows.length,
      successfulReferredBuyers: successfulBuyers,
      referredSellers: sellerListing,
      successfulSellerReferrals: sellerSale,
      referralGmvPence: gmv,
      discountsIssuedPence: discountsIssued,
      creditIssuedPence: creditIssued,
      creditRedeemedPence: creditRedeemed,
      pendingLiabilityPence: pendingLiability,
      creatorCommissionPendingPence: creatorPending,
      creatorCommissionPaidPence: creatorPaid,
      topReferrers,
      topCreators,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
