/**
 * Shared admin creator insights — single source of truth for
 * Admin → Creators detail and Admin → Users → Creator tab.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildCreatorObjectiveCopy } from "@/lib/creator/objective";
import { referralShareUrl } from "@/lib/referral/codes";
import { getAvailableCreditPence } from "@/lib/referral/credit";
import { getReferralSettings } from "@/lib/referral/settings";
import { ReferralRewardType } from "@/lib/referral/types";

const CREATOR_REWARD_TYPES = [
  ReferralRewardType.CREATOR_NEW_USER_REWARD,
  ReferralRewardType.CREATOR_LISTING_REWARD,
  ReferralRewardType.CREATOR_TRANSACTION_REWARD,
  ReferralRewardType.CREATOR_COMMISSION,
];

export type CreatorInsightsPreset = "7d" | "30d" | "all" | "custom";

export type CreatorInsightsRange = {
  from: string | null;
  to: string | null;
  preset: CreatorInsightsPreset;
};

export type CreatorInsightsFunnelStage = {
  key: string;
  label: string;
  total: number;
  conversionFromPrevious: number | null;
};

export type CreatorInsightsTrendPoint = {
  date: string;
  referredUsers: number;
  successfulListings: number;
  transactions: number;
  gmvPence: number;
  rewardsPence: number;
};

function isCountableRewardStatus(status: string): boolean {
  return status === "approved" || status === "paid" || status === "pending";
}

function inRange(iso: string | null | undefined, range: CreatorInsightsRange): boolean {
  if (!iso) return false;
  if (range.from && iso < range.from) return false;
  if (range.to && iso > range.to) return false;
  return true;
}

export function parseCreatorInsightsRange(opts: {
  preset?: string | null;
  from?: string | null;
  to?: string | null;
}): CreatorInsightsRange {
  const presetRaw = (opts.preset ?? "").trim().toLowerCase();
  const fromParam = opts.from?.trim() ?? null;
  const toParam = opts.to?.trim() ?? null;

  if (
    (presetRaw === "custom" || (!presetRaw && (fromParam || toParam))) &&
    (fromParam || toParam)
  ) {
    return {
      preset: "custom",
      from:
        fromParam && /^\d{4}-\d{2}-\d{2}/.test(fromParam)
          ? fromParam.length === 10
            ? `${fromParam}T00:00:00.000Z`
            : fromParam
          : null,
      to:
        toParam && /^\d{4}-\d{2}-\d{2}/.test(toParam)
          ? toParam.length === 10
            ? `${toParam}T23:59:59.999Z`
            : toParam
          : null,
    };
  }

  if (presetRaw === "all" || presetRaw === "all_time") {
    return { preset: "all", from: null, to: null };
  }

  if (presetRaw === "7d" || presetRaw === "7") {
    const to = new Date();
    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - 7);
    return { preset: "7d", from: from.toISOString(), to: to.toISOString() };
  }

  // Default: last 30 days
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 30);
  return { preset: "30d", from: from.toISOString(), to: to.toISOString() };
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function conversionPct(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round((current / previous) * 1000) / 10;
}

type RewardRow = {
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
};

type ReferralRow = {
  id: string;
  referred_user_id: string;
  attributed_at: string | null;
  created_at: string;
  users?: unknown;
};

function userLabel(user: {
  id?: string;
  email?: string | null;
  first_name?: string | null;
  surname?: string | null;
  display_name?: string | null;
} | null): string {
  if (!user) return "—";
  return (
    user.display_name ||
    [user.first_name, user.surname].filter(Boolean).join(" ") ||
    user.email ||
    user.id?.slice(0, 8) ||
    "—"
  );
}

/**
 * Load full admin insights for a creator by creators.id.
 */
export async function getCreatorAdminInsights(
  admin: SupabaseClient,
  creatorId: string,
  range: CreatorInsightsRange = parseCreatorInsightsRange({ preset: "all" })
) {
  const { data: creator, error } = await admin
    .from("creators")
    .select(
      "id, user_id, name, social_handle, social_url, referral_code_id, commission_pence, status, notes, created_at, updated_at, referral_codes(code, status), users:user_id(id, email, account_status, first_name, surname, display_name, avatar_path)"
    )
    .eq("id", creatorId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!creator) return null;

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
        display_name?: string;
        avatar_path?: string;
      }
    | {
        id?: string;
        email?: string;
        account_status?: string;
        first_name?: string;
        surname?: string;
        display_name?: string;
        avatar_path?: string;
      }[]
    | null;
  const userObj = Array.isArray(userRel) ? userRel[0] : userRel;

  const { data: referralsRaw } = await admin
    .from("referrals")
    .select(
      "id, referred_user_id, attributed_at, created_at, users:referred_user_id(id, email, first_name, surname, display_name, created_at)"
    )
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: false });

  const referrals = (referralsRaw ?? []) as ReferralRow[];
  const referralIds = referrals.map((r) => r.id);

  const { data: rewardsRaw } = referralIds.length
    ? await admin
        .from("referral_rewards")
        .select(
          "id, referral_id, reward_type, amount_pence, status, related_transaction_id, related_listing_id, created_at, approved_at, paid_at"
        )
        .in("referral_id", referralIds)
        .in("reward_type", CREATOR_REWARD_TYPES)
        .order("created_at", { ascending: false })
    : { data: [] as RewardRow[] };
  const rewards = (rewardsRaw ?? []) as RewardRow[];

  const rewardsByRef = new Map<string, RewardRow[]>();
  for (const rw of rewards) {
    const list = rewardsByRef.get(rw.referral_id) ?? [];
    list.push(rw);
    rewardsByRef.set(rw.referral_id, list);
  }

  const referredUserByRef = new Map<
    string,
    { id: string; label: string; email: string | null; joinedAt: string | null }
  >();
  for (const r of referrals) {
    const u = r.users as unknown as
      | {
          id?: string;
          email?: string;
          first_name?: string;
          surname?: string;
          display_name?: string;
          created_at?: string;
        }
      | {
          id?: string;
          email?: string;
          first_name?: string;
          surname?: string;
          display_name?: string;
          created_at?: string;
        }[]
      | null;
    const user = Array.isArray(u) ? u[0] : u;
    referredUserByRef.set(r.id, {
      id: r.referred_user_id,
      label: userLabel(user ?? null),
      email: user?.email ?? null,
      joinedAt: user?.created_at ?? r.attributed_at ?? r.created_at,
    });
  }

  // All-time performance (matches legacy creators/[id] GET)
  let newUserCount = 0;
  let listingCount = 0;
  let transactionCount = 0;
  let newUserPence = 0;
  let listingPence = 0;
  let transactionPence = 0;
  let legacyCommissionPence = 0;
  let totalCreditPence = 0;
  let earnedPence = 0;
  let paidPence = 0;
  let outstandingPence = 0;

  for (const rw of rewards) {
    const countable = isCountableRewardStatus(rw.status);
    if (countable) {
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
    if (rw.status === "paid") paidPence += rw.amount_pence;
    if (rw.status === "approved" || rw.status === "paid") earnedPence += rw.amount_pence;
    if (rw.status === "pending" || rw.status === "approved") outstandingPence += rw.amount_pence;
  }

  const availableCreditPence = creator.user_id
    ? await getAvailableCreditPence(admin, creator.user_id)
    : 0;

  // Time-filtered slices
  const referralsInRange = referrals.filter((r) =>
    inRange(r.attributed_at ?? r.created_at, range)
  );
  const rewardsInRange = rewards.filter((rw) =>
    inRange(rw.approved_at ?? rw.created_at, range)
  );

  let rangeListingCount = 0;
  let rangeTxCount = 0;
  let rangeRewardsPence = 0;
  for (const rw of rewardsInRange) {
    if (!isCountableRewardStatus(rw.status)) continue;
    rangeRewardsPence += rw.amount_pence;
    if (rw.reward_type === ReferralRewardType.CREATOR_LISTING_REWARD) rangeListingCount += 1;
    if (rw.reward_type === ReferralRewardType.CREATOR_TRANSACTION_REWARD) rangeTxCount += 1;
  }

  // Visits (link clicks)
  let visitsQuery = admin
    .from("referral_visits")
    .select("id, visit_on, created_at")
    .eq("referral_code_id", creator.referral_code_id);
  if (range.from) visitsQuery = visitsQuery.gte("visit_on", range.from.slice(0, 10));
  if (range.to) visitsQuery = visitsQuery.lte("visit_on", range.to.slice(0, 10));
  const { data: visits } = await visitsQuery;
  const visitCount = (visits ?? []).length;

  // All-time visits for overview
  const { count: visitsAllTime } = await admin
    .from("referral_visits")
    .select("id", { count: "exact", head: true })
    .eq("referral_code_id", creator.referral_code_id);

  // Attributed listings
  const listingIds = Array.from(
    new Set(
      rewards
        .filter((rw) => rw.related_listing_id)
        .map((rw) => rw.related_listing_id as string)
    )
  );
  const { data: listingRows } = listingIds.length
    ? await admin
        .from("listings")
        .select(
          "id, title, brand, model, price, status, archived_at, created_at, user_id, listing_images(storage_path, sort_order), users:user_id(id, email, first_name, surname, display_name)"
        )
        .in("id", listingIds)
    : { data: [] as Record<string, unknown>[] };
  const listingById = new Map((listingRows ?? []).map((l) => [l.id as string, l]));

  const attributedListings = rewards
    .filter(
      (rw) =>
        rw.reward_type === ReferralRewardType.CREATOR_LISTING_REWARD && rw.related_listing_id
    )
    .map((rw) => {
      const listing = listingById.get(rw.related_listing_id as string);
      const sellerRel = listing?.users as unknown as
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
        | null
        | undefined;
      const seller = Array.isArray(sellerRel) ? sellerRel[0] : sellerRel;
      const archived = Boolean(listing?.archived_at);
      let listingStatus = (listing?.status as string) ?? "unknown";
      if (archived) listingStatus = "removed";
      else if (listingStatus === "verified") listingStatus = "live";
      else if (listingStatus === "pending") listingStatus = "pending_verification";
      else if (listingStatus === "sold") listingStatus = "sold";

      let rewardStatus = "not_eligible";
      if (rw.status === "pending") rewardStatus = "pending";
      else if (rw.status === "approved" || rw.status === "paid") rewardStatus = "reward_issued";
      else if (rw.status === "cancelled" || rw.status === "reversed") rewardStatus = "not_eligible";
      else rewardStatus = "qualified";

      const images = listing?.listing_images as
        | { storage_path?: string; sort_order?: number }[]
        | undefined;
      const sortedImages = [...(images ?? [])].sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
      );
      const listingTitle =
        (listing?.title as string) ||
        [listing?.brand, listing?.model].filter(Boolean).join(" ") ||
        "Listing";

      return {
        rewardId: rw.id,
        listingId: rw.related_listing_id,
        title: listingTitle,
        pricePence: typeof listing?.price === "number" ? (listing.price as number) : null,
        status: listingStatus,
        createdAt: (listing?.created_at as string) ?? rw.created_at,
        imagePath: sortedImages[0]?.storage_path ?? null,
        sellerId: (listing?.user_id as string) ?? null,
        sellerLabel: userLabel(seller ?? null),
        rewardStatus,
        rewardAmountPence: rw.amount_pence,
        rewardDbStatus: rw.status,
        inRange: inRange(rw.approved_at ?? rw.created_at, range),
      };
    });

  // Attributed transactions
  const txIds = Array.from(
    new Set(
      rewards
        .filter((rw) => rw.related_transaction_id)
        .map((rw) => rw.related_transaction_id as string)
    )
  );
  const { data: txRows } = txIds.length
    ? await admin
        .from("transactions")
        .select(
          "id, amount, buyer_fee_amount_pence, status, order_state, created_at, completed_at, buyer_id, listing_id, users:buyer_id(id, email, first_name, surname, display_name)"
        )
        .in("id", txIds)
    : { data: [] as Record<string, unknown>[] };
  const txById = new Map((txRows ?? []).map((t) => [t.id as string, t]));

  let gmvPenceAll = 0;
  let revenuePenceAll = 0;
  let gmvPenceRange = 0;
  let revenuePenceRange = 0;

  const attributedTransactions = rewards
    .filter(
      (rw) =>
        rw.reward_type === ReferralRewardType.CREATOR_TRANSACTION_REWARD &&
        rw.related_transaction_id
    )
    .map((rw) => {
      const tx = txById.get(rw.related_transaction_id as string);
      const buyerRel = tx?.users as unknown as
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
        | null
        | undefined;
      const buyer = Array.isArray(buyerRel) ? buyerRel[0] : buyerRel;
      const amount = (tx?.amount as number) ?? 0;
      const fee = (tx?.buyer_fee_amount_pence as number) ?? 0;
      const completedAt =
        (tx?.completed_at as string) ?? (tx?.created_at as string) ?? rw.created_at;
      const refunded = (tx?.status as string) === "refunded";
      const countableTx = isCountableRewardStatus(rw.status) && !refunded;

      if (countableTx) {
        gmvPenceAll += amount;
        revenuePenceAll += fee;
        if (inRange(completedAt, range)) {
          gmvPenceRange += amount;
          revenuePenceRange += fee;
        }
      }

      return {
        rewardId: rw.id,
        transactionId: rw.related_transaction_id,
        listingId: (tx?.listing_id as string) ?? null,
        amountPence: amount,
        buyerFeePence: fee,
        status: (tx?.status as string) ?? rw.status,
        orderState: (tx?.order_state as string) ?? null,
        completedAt,
        buyerId: (tx?.buyer_id as string) ?? null,
        buyerLabel: userLabel(buyer ?? null),
        rewardAmountPence: rw.amount_pence,
        rewardStatus: rw.status,
        inRange: inRange(completedAt, range),
      };
    });

  const rewardsPaidInRange = rewardsInRange
    .filter((rw) => rw.status === "paid")
    .reduce((s, rw) => s + rw.amount_pence, 0);
  const revenueForRoi = range.preset === "all" ? revenuePenceAll : revenuePenceRange;
  const rewardsPaidForRoi =
    range.preset === "all"
      ? rewards.filter((rw) => rw.status === "paid").reduce((s, rw) => s + rw.amount_pence, 0)
      : rewardsPaidInRange;
  const roiRatio =
    revenueForRoi > 0 && rewardsPaidForRoi > 0
      ? Math.round((revenueForRoi / rewardsPaidForRoi) * 100) / 100
      : null;

  // Funnel (range-scoped)
  const signups = referralsInRange.length;
  const funnel: CreatorInsightsFunnelStage[] = [
    {
      key: "visits",
      label: "Link clicks",
      total: visitCount,
      conversionFromPrevious: null,
    },
    {
      key: "signups",
      label: "Sign-ups",
      total: signups,
      conversionFromPrevious: conversionPct(signups, visitCount),
    },
    {
      key: "listings",
      label: "Successful listings",
      total: rangeListingCount,
      conversionFromPrevious: conversionPct(rangeListingCount, signups),
    },
    {
      key: "transactions",
      label: "Transactions",
      total: rangeTxCount,
      conversionFromPrevious: conversionPct(rangeTxCount, rangeListingCount),
    },
  ];

  // Trend (daily buckets within range; for all-time use last 30 days for chart)
  const trendRange =
    range.preset === "all"
      ? parseCreatorInsightsRange({ preset: "30d" })
      : range;
  const trendStart = trendRange.from ? new Date(trendRange.from) : new Date();
  const trendEnd = trendRange.to ? new Date(trendRange.to) : new Date();
  const trendMap = new Map<string, CreatorInsightsTrendPoint>();
  for (let d = new Date(trendStart); d <= trendEnd; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    trendMap.set(key, {
      date: key,
      referredUsers: 0,
      successfulListings: 0,
      transactions: 0,
      gmvPence: 0,
      rewardsPence: 0,
    });
  }
  for (const r of referrals) {
    const key = dayKey(r.attributed_at ?? r.created_at);
    const point = trendMap.get(key);
    if (point) point.referredUsers += 1;
  }
  for (const rw of rewards) {
    if (!isCountableRewardStatus(rw.status)) continue;
    const key = dayKey(rw.approved_at ?? rw.created_at);
    const point = trendMap.get(key);
    if (!point) continue;
    point.rewardsPence += rw.amount_pence;
    if (rw.reward_type === ReferralRewardType.CREATOR_LISTING_REWARD) {
      point.successfulListings += 1;
    }
    if (rw.reward_type === ReferralRewardType.CREATOR_TRANSACTION_REWARD) {
      point.transactions += 1;
    }
  }
  for (const tx of attributedTransactions) {
    const key = dayKey(tx.completedAt);
    const point = trendMap.get(key);
    if (point) point.gmvPence += tx.amountPence;
  }
  const trend = Array.from(trendMap.values());

  const settings = await getReferralSettings(admin);
  const objective = buildCreatorObjectiveCopy(settings);
  const code = codeObj?.code ?? null;
  const shareUrl = code ? referralShareUrl(code) : null;

  // Enrollment audit (best-effort)
  const { data: enrolActions } = await admin
    .from("admin_actions")
    .select("action, created_at, admin_id, payload")
    .eq("target_type", "creator")
    .eq("target_id", creatorId)
    .in("action", ["create_creator", "reactivate_creator", "remove_creator"])
    .order("created_at", { ascending: false })
    .limit(10);

  return {
    enrolled: true as const,
    range: {
      preset: range.preset,
      from: range.from,
      to: range.to,
    },
    creator: {
      id: creator.id,
      name: creator.name,
      socialHandle: creator.social_handle,
      socialUrl: creator.social_url,
      code,
      codeStatus: codeObj?.status ?? null,
      shareUrl,
      status: creator.status as "active" | "paused" | "disabled",
      notes: creator.notes,
      createdAt: creator.created_at,
      updatedAt: creator.updated_at,
      teevoAccountRequired: !creator.user_id,
      user: creator.user_id
        ? {
            id: creator.user_id,
            email: userObj?.email ?? null,
            accountStatus: userObj?.account_status ?? "active",
            firstName: userObj?.first_name ?? null,
            surname: userObj?.surname ?? null,
            displayName: userObj?.display_name ?? null,
          }
        : null,
    },
    programme: {
      enabled: settings.creatorEnabled,
      objective: objective.objective,
      focusLabel: objective.focusLabel,
      rewardAmount: objective.rewardAmount,
      rewardPence: objective.rewardPence,
      rewardAction: objective.rewardAction,
      rewardLine: objective.enabled
        ? `${objective.rewardAmount} per ${objective.rewardAction}`
        : "No active reward for current focus",
    },
    performance: {
      referredUsers: referrals.length,
      successfulListings: listingCount,
      successfulTransactions: transactionCount,
      totalRewardsEarnedPence: totalCreditPence,
      availableCreditPence,
      earnedPence,
      paidPence,
      outstandingPence,
      visitsAllTime: visitsAllTime ?? 0,
      gmvPence: gmvPenceAll,
      teevoRevenuePence: revenuePenceAll,
      breakdown: [
        { rewardType: "new_user", qualifyingEvents: newUserCount, earningsPence: newUserPence },
        { rewardType: "listing", qualifyingEvents: listingCount, earningsPence: listingPence },
        {
          rewardType: "transaction",
          qualifyingEvents: transactionCount,
          earningsPence: transactionPence,
        },
        ...(legacyCommissionPence > 0 ||
        rewards.some((r) => r.reward_type === ReferralRewardType.CREATOR_COMMISSION)
          ? [
              {
                rewardType: "legacy_commission",
                qualifyingEvents: rewards.filter(
                  (r) => r.reward_type === ReferralRewardType.CREATOR_COMMISSION
                ).length,
                earningsPence: legacyCommissionPence,
              },
            ]
          : []),
      ],
    },
    performanceInRange: {
      referredUsers: referralsInRange.length,
      successfulListings: rangeListingCount,
      successfulTransactions: rangeTxCount,
      rewardsEarnedPence: rangeRewardsPence,
      visits: visitCount,
      gmvPence: range.preset === "all" ? gmvPenceAll : gmvPenceRange,
      teevoRevenuePence: range.preset === "all" ? revenuePenceAll : revenuePenceRange,
      rewardsPaidPence: rewardsPaidForRoi,
      roiRatio,
    },
    funnel,
    trend,
    referredUsers: referrals.map((r) => {
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
        .filter((rw) => isCountableRewardStatus(rw.status))
        .reduce((sum, rw) => sum + rw.amount_pence, 0);
      const listingN = rws.filter(
        (rw) => rw.reward_type === ReferralRewardType.CREATOR_LISTING_REWARD
      ).length;
      const purchaseN = rws.filter(
        (rw) => rw.reward_type === ReferralRewardType.CREATOR_TRANSACTION_REWARD
      ).length;
      return {
        referralId: r.id,
        userId: r.referred_user_id,
        label: user?.label ?? r.referred_user_id.slice(0, 8),
        email: user?.email ?? null,
        joinedAt: user?.joinedAt ?? r.attributed_at ?? r.created_at,
        attributedAt: r.attributed_at ?? r.created_at,
        signedUp: true,
        firstListing: hasListing,
        firstTransaction: hasTx,
        signupReward: hasSignup,
        listings: listingN,
        purchases: purchaseN,
        rewardsGeneratedPence: earned,
        inRange: inRange(r.attributed_at ?? r.created_at, range),
      };
    }),
    attributedListings,
    attributedTransactions,
    rewardHistory: rewards.map((rw) => {
      const user = referredUserByRef.get(rw.referral_id);
      return {
        id: rw.id,
        date: rw.approved_at ?? rw.created_at,
        referredUserId: user?.id ?? null,
        referredUserLabel: user?.label ?? "—",
        rewardType: rw.reward_type,
        amountPence: rw.amount_pence,
        status: rw.status,
        relatedListingId: rw.related_listing_id,
        relatedTransactionId: rw.related_transaction_id,
        reference: rw.related_transaction_id ?? rw.related_listing_id ?? rw.id,
        inRange: inRange(rw.approved_at ?? rw.created_at, range),
      };
    }),
    auditTrail: (enrolActions ?? []).map((a) => ({
      action: a.action,
      at: a.created_at,
      adminId: a.admin_id,
      payload: a.payload,
    })),
  };
}

export type CreatorAdminInsights = NonNullable<
  Awaited<ReturnType<typeof getCreatorAdminInsights>>
>;

/**
 * Resolve creator insights by Teevo user id. Returns { enrolled: false } when none.
 */
export async function getCreatorAdminInsightsByUserId(
  admin: SupabaseClient,
  userId: string,
  range?: CreatorInsightsRange
): Promise<CreatorAdminInsights | { enrolled: false }> {
  const { data: creator } = await admin
    .from("creators")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!creator) return { enrolled: false };
  const insights = await getCreatorAdminInsights(admin, creator.id, range);
  if (!insights) return { enrolled: false };
  return insights;
}
