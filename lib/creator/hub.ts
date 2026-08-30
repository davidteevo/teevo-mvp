/**
 * Creator Hub payload helpers — consumer-facing shapes only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { formatPoundsCompact } from "@/lib/pricing";
import { referralShareUrl } from "@/lib/referral/codes";
import {
  creatorPotentialEarningsLine,
  creatorToolkitCaptions,
} from "@/lib/referral/share-copy";
import type { ReferralSettings } from "@/lib/referral/settings";
import { ReferralRewardType } from "@/lib/referral/types";

const CREATOR_REWARD_TYPES = [
  ReferralRewardType.CREATOR_NEW_USER_REWARD,
  ReferralRewardType.CREATOR_LISTING_REWARD,
  ReferralRewardType.CREATOR_TRANSACTION_REWARD,
];

export type CreatorHubJourneyStep = {
  key: "join" | "list" | "transact";
  label: string;
  amountPence: number;
};

export type CreatorHubSquadMember = {
  referralId: string;
  shortId: string;
  label: string;
  joined: boolean;
  listed: boolean;
  transacted: boolean;
  completedSteps: number;
  totalSteps: number;
  earnedPence: number;
  remainingPence: number;
  nextStepHint: string | null;
};

export type CreatorHubActivityTone = "earned" | "pending" | "neutral";

export type CreatorHubActivityItem = {
  id: string;
  type: string;
  amountPence: number;
  title: string;
  body: string;
  createdAt: string;
  tone: CreatorHubActivityTone;
};

export type CreatorHubPersonalBest = {
  emoji: string;
  title: string;
  body: string;
} | null;

export type CreatorHubPayload = {
  firstName: string | null;
  code: string;
  url: string;
  status: string;
  programmePaused: boolean;
  creatorInactive: boolean;
  advertiseOpportunities: boolean;
  earnedPence: number;
  pendingPence: number;
  totalEarnedPence: number;
  opportunityPence: number;
  oneStepAwayCount: number;
  golfersReferred: number;
  successfulListings: number;
  successfulTransactions: number;
  rewardsThisWeek: number;
  suggestedMessage: string;
  rewardJourney: {
    steps: CreatorHubJourneyStep[];
    potentialTotalPence: number;
    headline: string;
  };
  mission: {
    title: string;
    body: string;
    ctaLabel: string;
    ctaUrl: string | null;
    rewardCallout: string;
    progressCurrent: number;
    progressTarget: number;
    potentialRewardPence: number;
  };
  squad: CreatorHubSquadMember[];
  squadFunnel: {
    joined: number;
    listed: number;
    transacted: number;
  };
  funnelThisMonth: {
    visits: number;
    joined: number;
    listed: number;
    transacted: number;
  };
  insight: string | null;
  activity: CreatorHubActivityItem[];
  streak: {
    current: number;
    target: number;
    remaining: number;
  };
  personalBest: CreatorHubPersonalBest;
  toolkit: { id: string; title: string; caption: string; platform?: string }[];
  isEmpty: boolean;
};

function startOfUtcMonth(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function startOfUtcWeek(d = new Date()): Date {
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - diff);
  return monday;
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function countableReward(status: string): boolean {
  return status === "approved" || status === "paid" || status === "pending";
}

/** Reward row exists for this type (any status) — blocks re-award via unique constraint. */
function hasRewardOfType(
  rewards: { reward_type: string }[],
  type: string
): boolean {
  return rewards.some((rw) => rw.reward_type === type);
}

export function fillMissionCallout(template: string, settings: ReferralSettings): string {
  return template
    .split("{join}").join(formatPoundsCompact(settings.creatorNewUserRewardPence))
    .split("{listing}").join(formatPoundsCompact(settings.creatorListingRewardPence))
    .split("{transact}").join(formatPoundsCompact(settings.creatorTransactionRewardPence));
}

/**
 * Remaining Teevo credit opportunity on one referral at current rates.
 * Join is already done for squad members. Cancelled/reversed rows still
 * occupy the unique slot — treat those milestones as unavailable.
 */
export function remainingOpportunityPence(
  member: { listed: boolean; transacted: boolean },
  settings: Pick<
    ReferralSettings,
    | "creatorListingRewardEnabled"
    | "creatorListingRewardPence"
    | "creatorTransactionRewardEnabled"
    | "creatorTransactionRewardPence"
  >,
  opts?: {
    /** When true, listing/tx already have a reward row of any status. */
    hasListingRewardRow?: boolean;
    hasTransactionRewardRow?: boolean;
  }
): number {
  let remaining = 0;
  const listingBlocked = opts?.hasListingRewardRow ?? member.listed;
  const txBlocked = opts?.hasTransactionRewardRow ?? member.transacted;

  if (
    !listingBlocked &&
    settings.creatorListingRewardEnabled &&
    settings.creatorListingRewardPence > 0
  ) {
    remaining += settings.creatorListingRewardPence;
  }
  if (
    !txBlocked &&
    settings.creatorTransactionRewardEnabled &&
    settings.creatorTransactionRewardPence > 0
  ) {
    remaining += settings.creatorTransactionRewardPence;
  }
  return remaining;
}

/** Primary per-referral reward used for mission potential (listing preferred). */
export function primaryMissionRewardPence(
  settings: Pick<
    ReferralSettings,
    | "creatorListingRewardEnabled"
    | "creatorListingRewardPence"
    | "creatorNewUserRewardEnabled"
    | "creatorNewUserRewardPence"
    | "creatorTransactionRewardEnabled"
    | "creatorTransactionRewardPence"
  >
): number {
  if (settings.creatorListingRewardEnabled && settings.creatorListingRewardPence > 0) {
    return settings.creatorListingRewardPence;
  }
  if (settings.creatorNewUserRewardEnabled && settings.creatorNewUserRewardPence > 0) {
    return settings.creatorNewUserRewardPence;
  }
  if (settings.creatorTransactionRewardEnabled && settings.creatorTransactionRewardPence > 0) {
    return settings.creatorTransactionRewardPence;
  }
  return 0;
}

/** True when exactly one enabled post-join milestone remains. */
export function isOneStepAway(
  member: { listed: boolean; transacted: boolean },
  settings: Pick<
    ReferralSettings,
    | "creatorListingRewardEnabled"
    | "creatorListingRewardPence"
    | "creatorTransactionRewardEnabled"
    | "creatorTransactionRewardPence"
  >
): boolean {
  const listingOpen =
    !member.listed &&
    settings.creatorListingRewardEnabled &&
    settings.creatorListingRewardPence > 0;
  const txOpen =
    !member.transacted &&
    settings.creatorTransactionRewardEnabled &&
    settings.creatorTransactionRewardPence > 0;
  return (listingOpen ? 1 : 0) + (txOpen ? 1 : 0) === 1;
}

function activityCopy(
  rewardType: string,
  amountPence: number,
  status: string
): { title: string; body: string; tone: CreatorHubActivityTone } {
  const amount = formatPoundsCompact(amountPence);
  const pending = status === "pending";

  if (rewardType === "creator_join") {
    return {
      title: "New golfer joined your squad",
      body: "Someone signed up with your Creator Link.",
      tone: "neutral",
    };
  }
  if (rewardType === ReferralRewardType.CREATOR_NEW_USER_REWARD) {
    if (pending) {
      return {
        title: `${amount} pending`,
        body: "Join reward is waiting to clear.",
        tone: "pending",
      };
    }
    return {
      title: `Someone joined Teevo`,
      body: `+${amount} Teevo credit earned.`,
      tone: "earned",
    };
  }
  if (rewardType === ReferralRewardType.CREATOR_LISTING_REWARD) {
    if (pending) {
      return {
        title: "Listing approved",
        body: `${amount} Teevo credit pending.`,
        tone: "pending",
      };
    }
    return {
      title: "New listing approved",
      body: `+${amount} Teevo credit earned.`,
      tone: "earned",
    };
  }
  if (rewardType === ReferralRewardType.CREATOR_TRANSACTION_REWARD) {
    if (pending) {
      return {
        title: "First transaction completed",
        body: `${amount} Teevo credit pending.`,
        tone: "pending",
      };
    }
    return {
      title: "First transaction completed",
      body: `+${amount} Teevo credit earned.`,
      tone: "earned",
    };
  }
  return {
    title: pending ? `${amount} pending` : `You earned ${amount}`,
    body: "A reward from your creator programme.",
    tone: pending ? "pending" : "earned",
  };
}

/** Stable anonymised label — never expose referee names. */
function squadLabel(userId: string): { label: string; shortId: string } {
  const shortId = userId.replace(/-/g, "").slice(0, 4).toUpperCase();
  return { label: `Golfer #${shortId}`, shortId };
}

function nextStepHint(
  member: { joined: boolean; listed: boolean; transacted: boolean },
  settings: ReferralSettings,
  totalSteps: number,
  advertiseOpportunities: boolean
): string | null {
  if (!advertiseOpportunities || totalSteps === 0) return null;
  if (member.joined && !member.listed && settings.creatorListingRewardEnabled) {
    return `Next milestone: first listing (+${formatPoundsCompact(settings.creatorListingRewardPence)})`;
  }
  if (member.listed && !member.transacted && settings.creatorTransactionRewardEnabled) {
    return `Next milestone: first transaction (+${formatPoundsCompact(settings.creatorTransactionRewardPence)})`;
  }
  if (
    member.joined &&
    !member.listed &&
    !settings.creatorListingRewardEnabled &&
    settings.creatorTransactionRewardEnabled
  ) {
    return `Next milestone: first transaction (+${formatPoundsCompact(settings.creatorTransactionRewardPence)})`;
  }
  return null;
}

function buildInsight(funnel: {
  visits: number;
  joined: number;
  listed: number;
  transacted: number;
}): string | null {
  if (funnel.joined >= 2 && funnel.listed > 0) {
    const pct = Math.round((funnel.listed / funnel.joined) * 100);
    if (pct >= 40) {
      return `${pct}% of your signups went on to list.`;
    }
  }
  const joinedNotListed = funnel.joined - funnel.listed;
  if (joinedNotListed >= 2) {
    return `${joinedNotListed} golfers joined but haven't listed yet.`;
  }
  if (funnel.listed >= 2 && funnel.transacted === 0) {
    return `${funnel.listed} golfers listed — next up is their first transaction.`;
  }
  if (funnel.joined >= 1 && funnel.listed === 0) {
    return `Encourage your squad to list their first club.`;
  }
  return null;
}

function buildPersonalBest(opts: {
  referralsThisMonth: number;
  joinsByMonth: Map<string, number>;
  recentSquad: CreatorHubSquadMember[];
}): CreatorHubPersonalBest {
  const thisKey = monthKey(new Date().toISOString());
  let bestOther = 0;
  Array.from(opts.joinsByMonth.entries()).forEach(([key, count]) => {
    if (key === thisKey) return;
    if (count > bestOther) bestOther = count;
  });
  if (opts.referralsThisMonth >= 3 && opts.referralsThisMonth > bestOther) {
    return {
      emoji: "🏆",
      title: "Best month yet",
      body: `You've brought ${opts.referralsThisMonth} new golfers to Teevo this month.`,
    };
  }
  const recent = opts.recentSquad.slice(0, 5);
  if (recent.length >= 5) {
    const listed = recent.filter((m) => m.listed).length;
    if (listed >= 4) {
      return {
        emoji: "🔥",
        title: "You're on a roll",
        body: `${listed} of your last ${recent.length} referrals created a listing.`,
      };
    }
  }
  return null;
}

export function buildJourneySteps(
  settings: ReferralSettings,
  advertiseOpportunities: boolean
): CreatorHubJourneyStep[] {
  if (!advertiseOpportunities) return [];
  const journeySteps: CreatorHubJourneyStep[] = [];
  if (settings.creatorNewUserRewardEnabled && settings.creatorNewUserRewardPence > 0) {
    journeySteps.push({
      key: "join",
      label: "They join",
      amountPence: settings.creatorNewUserRewardPence,
    });
  }
  if (settings.creatorListingRewardEnabled && settings.creatorListingRewardPence > 0) {
    journeySteps.push({
      key: "list",
      label: "They list",
      amountPence: settings.creatorListingRewardPence,
    });
  }
  if (settings.creatorTransactionRewardEnabled && settings.creatorTransactionRewardPence > 0) {
    journeySteps.push({
      key: "transact",
      label: "They transact",
      amountPence: settings.creatorTransactionRewardPence,
    });
  }
  return journeySteps;
}

/** Squad progress rails: always join; list/tx only when those rewards are enabled. */
export function progressStepKeys(
  settings: Pick<
    ReferralSettings,
    | "creatorListingRewardEnabled"
    | "creatorListingRewardPence"
    | "creatorTransactionRewardEnabled"
    | "creatorTransactionRewardPence"
  >
): Array<"join" | "list" | "transact"> {
  const keys: Array<"join" | "list" | "transact"> = ["join"];
  if (settings.creatorListingRewardEnabled && settings.creatorListingRewardPence > 0) {
    keys.push("list");
  }
  if (settings.creatorTransactionRewardEnabled && settings.creatorTransactionRewardPence > 0) {
    keys.push("transact");
  }
  return keys;
}

export async function getCreatorStatusForUser(
  admin: SupabaseClient,
  userId: string
): Promise<{ isCreator: boolean; status: string | null }> {
  const { data } = await admin
    .from("creators")
    .select("id, status")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return { isCreator: false, status: null };
  // Linked creator row → Hub entry available (including paused/disabled for historical view)
  return { isCreator: true, status: data.status };
}

export async function buildCreatorHubPayload(
  admin: SupabaseClient,
  opts: { userId: string; settings: ReferralSettings }
): Promise<{ error: "not_a_creator" } | { data: CreatorHubPayload }> {
  const { settings } = opts;

  const { data: creator } = await admin
    .from("creators")
    .select("id, status, referral_code_id, referral_codes(code, status)")
    .eq("user_id", opts.userId)
    .maybeSingle();

  if (!creator) {
    return { error: "not_a_creator" };
  }

  const programmePaused = !settings.creatorEnabled;
  const creatorInactive = creator.status !== "active";
  const advertiseOpportunities = !programmePaused && !creatorInactive;

  const codeRel = creator.referral_codes as unknown as
    | { code?: string; status?: string }
    | { code?: string; status?: string }[]
    | null;
  const codeObj = Array.isArray(codeRel) ? codeRel[0] : codeRel;
  const code = codeObj?.code;
  if (!code) return { error: "not_a_creator" };

  const { data: profile } = await admin
    .from("users")
    .select("first_name")
    .eq("id", opts.userId)
    .maybeSingle();

  const { data: referrals } = await admin
    .from("referrals")
    .select("id, referred_user_id, attributed_at, created_at")
    .eq("creator_id", creator.id)
    .order("created_at", { ascending: false });

  const referralIds = (referrals ?? []).map((r) => r.id);
  const { data: rewards } = referralIds.length
    ? await admin
        .from("referral_rewards")
        .select(
          "id, referral_id, reward_type, amount_pence, status, created_at, approved_at"
        )
        .in("referral_id", referralIds)
        .in("reward_type", CREATOR_REWARD_TYPES)
        .order("created_at", { ascending: false })
    : {
        data: [] as {
          id: string;
          referral_id: string;
          reward_type: string;
          amount_pence: number;
          status: string;
          created_at: string;
          approved_at: string | null;
        }[],
      };

  const rewardsByRef = new Map<string, NonNullable<typeof rewards>>();
  for (const rw of rewards ?? []) {
    const list = rewardsByRef.get(rw.referral_id) ?? [];
    list.push(rw);
    rewardsByRef.set(rw.referral_id, list);
  }

  let earnedPence = 0;
  let pendingPence = 0;
  let successfulListings = 0;
  let successfulTransactions = 0;
  const weekStart = startOfUtcWeek().toISOString();
  let rewardsThisWeek = 0;
  for (const rw of rewards ?? []) {
    if (!countableReward(rw.status)) continue;
    if (rw.status === "pending") pendingPence += rw.amount_pence;
    else earnedPence += rw.amount_pence;
    if (rw.reward_type === ReferralRewardType.CREATOR_LISTING_REWARD) successfulListings += 1;
    if (rw.reward_type === ReferralRewardType.CREATOR_TRANSACTION_REWARD) {
      successfulTransactions += 1;
    }
    const ts = rw.approved_at ?? rw.created_at;
    if (ts >= weekStart) rewardsThisWeek += 1;
  }

  const journeySteps = buildJourneySteps(settings, advertiseOpportunities);
  const potentialTotalPence = journeySteps.reduce((s, step) => s + step.amountPence, 0);
  const progressKeys = progressStepKeys(settings);
  const totalProgressSteps = progressKeys.length;

  let opportunityPence = 0;
  let oneStepAwayCount = 0;

  const squad: CreatorHubSquadMember[] = (referrals ?? []).map((r) => {
    const { label, shortId } = squadLabel(r.referred_user_id);
    const rws = rewardsByRef.get(r.id) ?? [];
    const memberJoined = true;
    const hasListingRow = hasRewardOfType(rws, ReferralRewardType.CREATOR_LISTING_REWARD);
    const hasTxRow = hasRewardOfType(rws, ReferralRewardType.CREATOR_TRANSACTION_REWARD);
    const memberListed = rws.some(
      (rw) =>
        rw.reward_type === ReferralRewardType.CREATOR_LISTING_REWARD && countableReward(rw.status)
    );
    const memberTransacted = rws.some(
      (rw) =>
        rw.reward_type === ReferralRewardType.CREATOR_TRANSACTION_REWARD &&
        countableReward(rw.status)
    );

    let completedSteps = 0;
    for (const key of progressKeys) {
      if (key === "join" && memberJoined) completedSteps += 1;
      if (key === "list" && memberListed) completedSteps += 1;
      if (key === "transact" && memberTransacted) completedSteps += 1;
    }

    const earned = rws
      .filter((rw) => countableReward(rw.status))
      .reduce((sum, rw) => sum + rw.amount_pence, 0);

    const remaining = advertiseOpportunities
      ? remainingOpportunityPence(
          { listed: memberListed, transacted: memberTransacted },
          settings,
          { hasListingRewardRow: hasListingRow, hasTransactionRewardRow: hasTxRow }
        )
      : 0;
    opportunityPence += remaining;

    if (
      advertiseOpportunities &&
      isOneStepAway(
        { listed: memberListed || hasListingRow, transacted: memberTransacted || hasTxRow },
        settings
      )
    ) {
      oneStepAwayCount += 1;
    }

    return {
      referralId: r.id,
      shortId,
      label,
      joined: memberJoined,
      listed: memberListed,
      transacted: memberTransacted,
      completedSteps,
      totalSteps: totalProgressSteps,
      earnedPence: earned,
      remainingPence: remaining,
      nextStepHint: nextStepHint(
        { joined: memberJoined, listed: memberListed, transacted: memberTransacted },
        settings,
        journeySteps.length,
        advertiseOpportunities
      ),
    };
  });

  const monthStart = startOfUtcMonth();
  const monthStartIso = monthStart.toISOString();
  const monthStartDate = monthStartIso.slice(0, 10);
  const { count: visitCount } = await admin
    .from("referral_visits")
    .select("id", { count: "exact", head: true })
    .eq("referral_code_id", creator.referral_code_id)
    .gte("visit_on", monthStartDate);

  let joinedMonth = 0;
  let listedMonth = 0;
  let transactedMonth = 0;
  const joinsByMonth = new Map<string, number>();

  for (const r of referrals ?? []) {
    const joinedAt = r.attributed_at ?? r.created_at;
    const key = monthKey(joinedAt);
    joinsByMonth.set(key, (joinsByMonth.get(key) ?? 0) + 1);
    if (joinedAt >= monthStartIso) joinedMonth += 1;
  }
  for (const rw of rewards ?? []) {
    if (!countableReward(rw.status)) continue;
    const ts = rw.approved_at ?? rw.created_at;
    if (ts < monthStartIso) continue;
    if (rw.reward_type === ReferralRewardType.CREATOR_LISTING_REWARD) listedMonth += 1;
    if (rw.reward_type === ReferralRewardType.CREATOR_TRANSACTION_REWARD) transactedMonth += 1;
  }

  const funnelThisMonth = {
    visits: visitCount ?? 0,
    joined: joinedMonth,
    listed: listedMonth,
    transacted: transactedMonth,
  };

  const referralIdsWithJoinReward = new Set(
    (rewards ?? [])
      .filter((rw) => rw.reward_type === ReferralRewardType.CREATOR_NEW_USER_REWARD)
      .map((rw) => rw.referral_id)
  );

  const rewardActivity: CreatorHubActivityItem[] = (rewards ?? [])
    .filter((rw) => countableReward(rw.status))
    .map((rw) => {
      const copy = activityCopy(rw.reward_type, rw.amount_pence, rw.status);
      return {
        id: rw.id,
        type: rw.reward_type,
        amountPence: rw.amount_pence,
        title: copy.title,
        body: copy.body,
        createdAt: rw.approved_at ?? rw.created_at,
        tone: copy.tone,
      };
    });

  const joinOnlyActivity: CreatorHubActivityItem[] = (referrals ?? [])
    .filter((r) => !referralIdsWithJoinReward.has(r.id))
    .map((r) => {
      const copy = activityCopy("creator_join", 0, "approved");
      return {
        id: `join-${r.id}`,
        type: "creator_join",
        amountPence: 0,
        title: copy.title,
        body: copy.body,
        createdAt: r.attributed_at ?? r.created_at,
        tone: copy.tone,
      };
    });

  const activity: CreatorHubActivityItem[] = [...rewardActivity, ...joinOnlyActivity]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 50);

  const streakCurrent = joinedMonth;
  const streakTarget = settings.creatorMonthlyReferralTarget;
  const streakRemaining = Math.max(0, streakTarget - streakCurrent);
  const personalBest = buildPersonalBest({
    referralsThisMonth: joinedMonth,
    joinsByMonth,
    recentSquad: squad,
  });

  const url = referralShareUrl(code);
  const suggestedMessage =
    (settings.creatorSuggestedMessage ?? "").trim() ||
    "Got golf clubs gathering dust?\n\nSell them on Teevo — the marketplace built for golf gear.";
  const isEmpty = (referrals ?? []).length === 0 && earnedPence === 0 && pendingPence === 0;

  const missionPotential =
    advertiseOpportunities ? streakRemaining * primaryMissionRewardPence(settings) : 0;

  return {
    data: {
      firstName: profile?.first_name ?? null,
      code,
      url,
      status: creator.status,
      programmePaused,
      creatorInactive,
      advertiseOpportunities,
      earnedPence,
      pendingPence,
      totalEarnedPence: earnedPence + pendingPence,
      opportunityPence,
      oneStepAwayCount,
      golfersReferred: (referrals ?? []).length,
      successfulListings,
      successfulTransactions,
      rewardsThisWeek,
      suggestedMessage,
      rewardJourney: {
        steps: journeySteps,
        potentialTotalPence,
        headline: advertiseOpportunities
          ? creatorPotentialEarningsLine(potentialTotalPence)
          : "Reward opportunities are currently paused.",
      },
      mission: {
        title: settings.creatorMissionTitle,
        body: settings.creatorMissionBody,
        ctaLabel: settings.creatorMissionCtaLabel,
        ctaUrl: settings.creatorMissionCtaUrl.trim() || null,
        rewardCallout: advertiseOpportunities
          ? fillMissionCallout(settings.creatorMissionRewardCallout, settings)
          : "",
        progressCurrent: streakCurrent,
        progressTarget: streakTarget,
        potentialRewardPence: missionPotential,
      },
      squad,
      squadFunnel: {
        joined: (referrals ?? []).length,
        listed: successfulListings,
        transacted: successfulTransactions,
      },
      funnelThisMonth,
      insight: buildInsight(funnelThisMonth),
      activity,
      streak: {
        current: streakCurrent,
        target: streakTarget,
        remaining: streakRemaining,
      },
      personalBest,
      toolkit: creatorToolkitCaptions(url, suggestedMessage, settings.creatorMissionBody),
      isEmpty,
    },
  };
}
