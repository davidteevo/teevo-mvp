import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getAvailableCreditPence,
  insertCreditTransaction,
  reverseAvailableCreditForReward,
  reverseRedemptionForTransaction,
  type CreditType,
} from "@/lib/referral/credit";
import { creditExpiresAt, getReferralSettings, type ReferralSettings } from "@/lib/referral/settings";
import { getReferralForUser, type ReferralRow } from "@/lib/referral/attribution";
import {
  decideCreatorMilestone,
  decideNewCustomerDiscount,
  isDemandReferral,
  isSupplyReferral,
} from "@/lib/referral/eligibility";
import { trackServerEvent } from "@/lib/starter-pack";
import { notifyReferralRewardApproved } from "@/lib/referral/notify";
import {
  isCreatorMilestoneRewardType,
  ReferralRewardStatus,
  ReferralRewardType,
  type ReferralRewardTypeValue,
} from "@/lib/referral/types";

export { ReferralRewardStatus, ReferralRewardType, type ReferralRewardTypeValue };

function creditTypeForReward(rewardType: ReferralRewardTypeValue): CreditType | null {
  if (rewardType === ReferralRewardType.BUYER_REFERRER_CREDIT) return "referral_buyer_reward";
  if (rewardType === ReferralRewardType.SELLER_LISTING_CREDIT) return "seller_listing_referral";
  if (rewardType === ReferralRewardType.SELLER_SALE_CREDIT) return "seller_sale_referral";
  if (rewardType === ReferralRewardType.REFERRED_SELLER_LISTING_CREDIT) {
    return "referred_seller_listing_credit";
  }
  if (isCreatorMilestoneRewardType(rewardType)) return "creator_milestone_reward";
  return null;
}

export async function createPendingReward(
  admin: SupabaseClient,
  opts: {
    referralId: string;
    rewardType: ReferralRewardTypeValue;
    amountPence: number;
    relatedTransactionId?: string | null;
    relatedListingId?: string | null;
  }
): Promise<{ id: string; created: boolean } | null> {
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("referral_rewards")
    .insert({
      referral_id: opts.referralId,
      reward_type: opts.rewardType,
      amount_pence: opts.amountPence,
      status: ReferralRewardStatus.PENDING,
      related_transaction_id: opts.relatedTransactionId ?? null,
      related_listing_id: opts.relatedListingId ?? null,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      const existingQuery = admin
        .from("referral_rewards")
        .select("id")
        .eq("referral_id", opts.referralId)
        .eq("reward_type", opts.rewardType);
      const { data: existing } = await existingQuery.maybeSingle();
      return existing?.id ? { id: existing.id, created: false } : null;
    }
    console.error("createPendingReward failed", error);
    return null;
  }
  if (!data?.id) return null;
  await trackServerEvent(admin, "referral_reward_pending", {
    properties: {
      reward_id: data.id,
      reward_type: opts.rewardType,
      referral_id: opts.referralId,
      amount_pence: opts.amountPence,
    },
  });
  return { id: data.id, created: true };
}

async function issueAvailableCredit(
  admin: SupabaseClient,
  opts: {
    rewardId: string;
    rewardType: ReferralRewardTypeValue;
    userId: string;
    amountPence: number;
    relatedTransactionId?: string | null;
  }
): Promise<string | null> {
  const creditType = creditTypeForReward(opts.rewardType);
  if (!creditType) return null;
  const settings = await getReferralSettings(admin);
  const issued = await insertCreditTransaction(admin, {
    userId: opts.userId,
    amountPence: opts.amountPence,
    type: creditType,
    status: "available",
    referralRewardId: opts.rewardId,
    relatedTransactionId: opts.relatedTransactionId ?? null,
    expiresAt: creditExpiresAt(new Date(), settings.creditExpiryDays),
    approvedAt: new Date().toISOString(),
  });
  if (issued?.id) {
    await admin
      .from("referral_rewards")
      .update({ credit_transaction_id: issued.id, updated_at: new Date().toISOString() })
      .eq("id", opts.rewardId);
  }
  return issued?.id ?? null;
}

async function resolveCreditUserId(
  admin: SupabaseClient,
  rewardType: string,
  referral: { referrer_user_id: string; referred_user_id: string; creator_id: string | null } | null
): Promise<string | null> {
  if (!referral) return null;
  if (rewardType === ReferralRewardType.REFERRED_SELLER_LISTING_CREDIT) {
    return referral.referred_user_id;
  }
  if (isCreatorMilestoneRewardType(rewardType)) {
    if (!referral.creator_id) return null;
    const { data: creator } = await admin
      .from("creators")
      .select("user_id")
      .eq("id", referral.creator_id)
      .maybeSingle();
    return creator?.user_id ?? null;
  }
  return referral.referrer_user_id;
}

export async function approveReward(
  admin: SupabaseClient,
  rewardId: string
): Promise<boolean> {
  const { data: reward } = await admin
    .from("referral_rewards")
    .select("id, referral_id, reward_type, amount_pence, status, related_transaction_id")
    .eq("id", rewardId)
    .maybeSingle();
  if (!reward) return false;
  if (reward.status === ReferralRewardStatus.APPROVED || reward.status === ReferralRewardStatus.PAID) {
    return true;
  }
  if (reward.status !== ReferralRewardStatus.PENDING) return false;

  const now = new Date().toISOString();
  const { data: updated } = await admin
    .from("referral_rewards")
    .update({
      status: ReferralRewardStatus.APPROVED,
      approved_at: now,
      updated_at: now,
    })
    .eq("id", rewardId)
    .eq("status", ReferralRewardStatus.PENDING)
    .select("id")
    .maybeSingle();
  if (!updated) return false;

  const { data: referral } = await admin
    .from("referrals")
    .select("referrer_user_id, referred_user_id, creator_id")
    .eq("id", reward.referral_id)
    .maybeSingle();

  if (reward.reward_type !== ReferralRewardType.CREATOR_COMMISSION) {
    const creditUserId = await resolveCreditUserId(admin, reward.reward_type, referral);
    if (creditUserId) {
      await issueAvailableCredit(admin, {
        rewardId,
        rewardType: reward.reward_type as ReferralRewardTypeValue,
        userId: creditUserId,
        amountPence: reward.amount_pence,
        relatedTransactionId: reward.related_transaction_id,
      });
      await notifyReferralRewardApproved(admin, {
        referrerUserId: creditUserId,
        rewardId,
        rewardType: reward.reward_type as ReferralRewardTypeValue,
        amountPence: reward.amount_pence,
      }).catch((e) => console.error("notifyReferralRewardApproved failed", e));
    }
  }

  await trackServerEvent(admin, "referral_reward_approved", {
    userId: (await resolveCreditUserId(admin, reward.reward_type, referral)) ?? undefined,
    properties: {
      reward_id: rewardId,
      reward_type: reward.reward_type,
      amount_pence: reward.amount_pence,
    },
  });
  if (
    reward.reward_type === ReferralRewardType.CREATOR_COMMISSION ||
    isCreatorMilestoneRewardType(reward.reward_type)
  ) {
    await trackServerEvent(admin, "creator_referral_conversion", {
      properties: {
        reward_id: rewardId,
        referral_id: reward.referral_id,
        creator_id: referral?.creator_id,
        amount_pence: reward.amount_pence,
        reward_type: reward.reward_type,
      },
    });
  }
  return true;
}

export async function cancelReward(
  admin: SupabaseClient,
  rewardId: string,
  notes?: string
): Promise<boolean> {
  const now = new Date().toISOString();
  const { data } = await admin
    .from("referral_rewards")
    .update({
      status: ReferralRewardStatus.CANCELLED,
      cancelled_at: now,
      updated_at: now,
      ...(notes ? { admin_notes: notes } : {}),
    })
    .eq("id", rewardId)
    .eq("status", ReferralRewardStatus.PENDING)
    .select("id")
    .maybeSingle();
  return !!data;
}

export async function reverseApprovedReward(
  admin: SupabaseClient,
  rewardId: string,
  notes?: string
): Promise<boolean> {
  const { data: reward } = await admin
    .from("referral_rewards")
    .select("id, status")
    .eq("id", rewardId)
    .maybeSingle();
  if (!reward) return false;
  if (reward.status === ReferralRewardStatus.PENDING) {
    return cancelReward(admin, rewardId, notes);
  }
  if (reward.status !== ReferralRewardStatus.APPROVED && reward.status !== ReferralRewardStatus.PAID) {
    return false;
  }
  const now = new Date().toISOString();
  const { data } = await admin
    .from("referral_rewards")
    .update({
      status: ReferralRewardStatus.REVERSED,
      cancelled_at: now,
      updated_at: now,
      ...(notes ? { admin_notes: notes } : {}),
    })
    .eq("id", rewardId)
    .in("status", [ReferralRewardStatus.APPROVED, ReferralRewardStatus.PAID])
    .select("id")
    .maybeSingle();
  if (!data) return false;
  await reverseAvailableCreditForReward(admin, rewardId);
  await trackServerEvent(admin, "referral_reward_reversed", {
    properties: { reward_id: rewardId },
  });
  return true;
}

export async function markCreatorCommissionPaid(
  admin: SupabaseClient,
  rewardId: string
): Promise<boolean> {
  const now = new Date().toISOString();
  const { data } = await admin
    .from("referral_rewards")
    .update({ status: ReferralRewardStatus.PAID, paid_at: now, updated_at: now })
    .eq("id", rewardId)
    .eq("reward_type", ReferralRewardType.CREATOR_COMMISSION)
    .eq("status", ReferralRewardStatus.APPROVED)
    .select("id")
    .maybeSingle();
  return !!data;
}

async function countPriorBuyerPurchases(
  admin: SupabaseClient,
  buyerId: string,
  excludeTransactionId?: string
): Promise<number> {
  let query = admin
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("buyer_id", buyerId)
    .neq("status", "refunded");
  if (excludeTransactionId) query = query.neq("id", excludeTransactionId);
  const { count } = await query;
  return count ?? 0;
}

async function hasExistingReward(
  admin: SupabaseClient,
  referralId: string,
  rewardType: ReferralRewardTypeValue
): Promise<boolean> {
  const { data } = await admin
    .from("referral_rewards")
    .select("id")
    .eq("referral_id", referralId)
    .eq("reward_type", rewardType)
    .maybeSingle();
  return !!data;
}

type CreatorMilestoneKind = "new_user" | "listing" | "transaction";

function milestoneConfig(
  settings: ReferralSettings,
  kind: CreatorMilestoneKind
): { enabled: boolean; amountPence: number; rewardType: ReferralRewardTypeValue } {
  if (kind === "new_user") {
    return {
      enabled: settings.creatorNewUserRewardEnabled,
      amountPence: settings.creatorNewUserRewardPence,
      rewardType: ReferralRewardType.CREATOR_NEW_USER_REWARD,
    };
  }
  if (kind === "listing") {
    return {
      enabled: settings.creatorListingRewardEnabled,
      amountPence: settings.creatorListingRewardPence,
      rewardType: ReferralRewardType.CREATOR_LISTING_REWARD,
    };
  }
  return {
    enabled: settings.creatorTransactionRewardEnabled,
    amountPence: settings.creatorTransactionRewardPence,
    rewardType: ReferralRewardType.CREATOR_TRANSACTION_REWARD,
  };
}

/**
 * Idempotent: at most one reward of each creator milestone type per referral.
 * Issues Teevo credit to creators.user_id on approve.
 */
export async function maybeCreateCreatorMilestoneReward(
  admin: SupabaseClient,
  opts: {
    referral: ReferralRow;
    kind: CreatorMilestoneKind;
    relatedTransactionId?: string | null;
    relatedListingId?: string | null;
    settings?: ReferralSettings;
  }
): Promise<{ id: string; created: boolean } | null> {
  if (!opts.referral.creator_id) return null;
  const settings = opts.settings ?? (await getReferralSettings(admin));
  const cfg = milestoneConfig(settings, opts.kind);

  const { data: creator } = await admin
    .from("creators")
    .select("id, user_id, status")
    .eq("id", opts.referral.creator_id)
    .maybeSingle();
  if (!creator) return null;

  const exists = await hasExistingReward(admin, opts.referral.id, cfg.rewardType);
  const decision = decideCreatorMilestone({
    creatorProgrammeEnabled: settings.creatorEnabled,
    eventEnabled: cfg.enabled,
    amountPence: cfg.amountPence,
    creatorStatus: creator.status as "active" | "paused" | "disabled",
    creatorUserId: creator.user_id,
    referredUserId: opts.referral.referred_user_id,
    alreadyHasReward: exists,
  });
  if (!decision.ok) return null;

  const created = await createPendingReward(admin, {
    referralId: opts.referral.id,
    rewardType: cfg.rewardType,
    amountPence: cfg.amountPence,
    relatedTransactionId: opts.relatedTransactionId ?? null,
    relatedListingId: opts.relatedListingId ?? null,
  });
  if (!created) return null;
  await approveReward(admin, created.id);
  return created;
}

/**
 * After a paid checkout: store incentives, redeem credit, create pending rewards.
 */
export async function onCheckoutComplete(
  admin: SupabaseClient,
  opts: {
    transactionId: string;
    buyerId: string;
    sellerId: string;
    listingId: string;
    itemPence: number;
    referralDiscountPence: number;
    creditRedeemedPence: number;
  }
): Promise<void> {
  const settings = await getReferralSettings(admin);
  const buyerReferral = await getReferralForUser(admin, opts.buyerId);
  const sellerReferral = await getReferralForUser(admin, opts.sellerId);

  await admin
    .from("transactions")
    .update({
      referral_discount_pence: opts.referralDiscountPence,
      credit_redeemed_pence: opts.creditRedeemedPence,
      referral_id: buyerReferral?.id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", opts.transactionId);

  if (opts.creditRedeemedPence > 0) {
    const available = await getAvailableCreditPence(admin, opts.buyerId);
    const redeem = Math.min(opts.creditRedeemedPence, available);
    if (redeem > 0) {
      await insertCreditTransaction(admin, {
        userId: opts.buyerId,
        amountPence: -redeem,
        type: "redemption",
        status: "redeemed",
        relatedTransactionId: opts.transactionId,
      });
      await trackServerEvent(admin, "referral_credit_redeemed", {
        userId: opts.buyerId,
        properties: { transaction_id: opts.transactionId, amount_pence: redeem },
      });
    }
  }

  if (buyerReferral) {
    await maybeCreateBuyerConversionRewards(admin, {
      referral: buyerReferral,
      transactionId: opts.transactionId,
      buyerId: opts.buyerId,
      itemPence: opts.itemPence,
      discountApplied: opts.referralDiscountPence > 0,
      settings,
    });
  }

  if (sellerReferral && settings.sellerEnabled && sellerReferral.referred_user_id === opts.sellerId) {
    const exists = await hasExistingReward(admin, sellerReferral.id, ReferralRewardType.SELLER_SALE_CREDIT);
    if (!exists) {
      await createPendingReward(admin, {
        referralId: sellerReferral.id,
        rewardType: ReferralRewardType.SELLER_SALE_CREDIT,
        amountPence: settings.sellerSaleRewardPence,
        relatedTransactionId: opts.transactionId,
        relatedListingId: opts.listingId,
      });
      await trackServerEvent(admin, "referral_first_sale", {
        userId: opts.sellerId,
        properties: { referral_id: sellerReferral.id, transaction_id: opts.transactionId },
      });
    }
  }
}

async function maybeCreateBuyerConversionRewards(
  admin: SupabaseClient,
  opts: {
    referral: ReferralRow;
    transactionId: string;
    buyerId: string;
    itemPence: number;
    discountApplied: boolean;
    settings: ReferralSettings;
  }
): Promise<void> {
  if (!isDemandReferral(opts.referral, opts.settings)) return;

  const prior = await countPriorBuyerPurchases(admin, opts.buyerId, opts.transactionId);
  const decision = decideNewCustomerDiscount({
    programmeEnabled: true,
    hasReferral: true,
    isSelfReferral: opts.referral.referrer_user_id === opts.buyerId,
    priorNonRefundedBuyerPurchases: prior,
    itemPence: opts.itemPence,
    minItemPence: opts.settings.minItemPence,
  });
  if (!decision.eligible && !opts.discountApplied) return;

  // Creator referrals no longer create creator_commission; milestones settle on order completion / signup / listing.
  if (!opts.referral.creator_id) {
    await createPendingReward(admin, {
      referralId: opts.referral.id,
      rewardType: ReferralRewardType.BUYER_REFERRER_CREDIT,
      amountPence: opts.settings.referrerRewardPence,
      relatedTransactionId: opts.transactionId,
    });
  }
  await trackServerEvent(admin, "referral_first_purchase", {
    userId: opts.buyerId,
    properties: {
      referral_id: opts.referral.id,
      transaction_id: opts.transactionId,
      creator_id: opts.referral.creator_id,
    },
  });
}

export async function onOrderCompleted(admin: SupabaseClient, transactionId: string): Promise<void> {
  const { data: rewards } = await admin
    .from("referral_rewards")
    .select("id")
    .eq("related_transaction_id", transactionId)
    .eq("status", ReferralRewardStatus.PENDING);
  for (const reward of rewards ?? []) {
    await approveReward(admin, reward.id);
  }

  const { data: tx } = await admin
    .from("transactions")
    .select("id, buyer_id, seller_id")
    .eq("id", transactionId)
    .maybeSingle();
  if (!tx) return;

  const settings = await getReferralSettings(admin);
  const participantIds = Array.from(new Set([tx.buyer_id, tx.seller_id].filter(Boolean))) as string[];
  for (const userId of participantIds) {
    const referral = await getReferralForUser(admin, userId);
    if (!referral?.creator_id) continue;
    await maybeCreateCreatorMilestoneReward(admin, {
      referral,
      kind: "transaction",
      relatedTransactionId: transactionId,
      settings,
    });
  }
}

export async function onOrderInvalidated(admin: SupabaseClient, transactionId: string): Promise<void> {
  const { data: rewards } = await admin
    .from("referral_rewards")
    .select("id, status")
    .eq("related_transaction_id", transactionId);
  for (const reward of rewards ?? []) {
    if (reward.status === ReferralRewardStatus.PENDING) {
      await cancelReward(admin, reward.id, "Underlying order cancelled or refunded");
    } else if (
      reward.status === ReferralRewardStatus.APPROVED ||
      reward.status === ReferralRewardStatus.PAID
    ) {
      await reverseApprovedReward(admin, reward.id, "Underlying order cancelled or refunded");
    }
  }
  await reverseRedemptionForTransaction(admin, transactionId);
}

export async function onListingVerified(
  admin: SupabaseClient,
  opts: { listingId: string; sellerId: string; createdOnBehalf?: boolean }
): Promise<void> {
  if (opts.createdOnBehalf) return;
  const settings = await getReferralSettings(admin);
  const referral = await getReferralForUser(admin, opts.sellerId);
  if (!referral) return;

  if (isSupplyReferral(referral, settings)) {
    const amountPence = settings.sellerListingRewardPence;
    const referrerExists = await hasExistingReward(
      admin,
      referral.id,
      ReferralRewardType.SELLER_LISTING_CREDIT
    );
    if (!referrerExists) {
      const created = await createPendingReward(admin, {
        referralId: referral.id,
        rewardType: ReferralRewardType.SELLER_LISTING_CREDIT,
        amountPence,
        relatedListingId: opts.listingId,
      });
      if (created?.created) {
        await approveReward(admin, created.id);
        await trackServerEvent(admin, "referral_first_listing", {
          userId: opts.sellerId,
          properties: { referral_id: referral.id, listing_id: opts.listingId },
        });
      } else if (created && !created.created) {
        await approveReward(admin, created.id);
      }
    }

    const referredExists = await hasExistingReward(
      admin,
      referral.id,
      ReferralRewardType.REFERRED_SELLER_LISTING_CREDIT
    );
    if (!referredExists) {
      const created = await createPendingReward(admin, {
        referralId: referral.id,
        rewardType: ReferralRewardType.REFERRED_SELLER_LISTING_CREDIT,
        amountPence,
        relatedListingId: opts.listingId,
      });
      if (created) {
        await approveReward(admin, created.id);
      }
    }
  }

  if (referral.creator_id) {
    await maybeCreateCreatorMilestoneReward(admin, {
      referral,
      kind: "listing",
      relatedListingId: opts.listingId,
      settings,
    });
  }
}

export async function resolveCheckoutIncentivesForBuyer(
  admin: SupabaseClient,
  opts: {
    buyerId: string;
    itemPence: number;
    authenticityPence: number;
    shippingPence: number;
    applyCredit: boolean;
  }
): Promise<{
  referralDiscountPence: number;
  availableCreditPence: number;
  applyCredit: boolean;
  hasReferral: boolean;
  discountEligible: boolean;
  discountReason: string;
}> {
  const settings = await getReferralSettings(admin);
  const referral = await getReferralForUser(admin, opts.buyerId);
  const demandOk = !!referral && isDemandReferral(referral, settings);
  const prior = await countPriorBuyerPurchases(admin, opts.buyerId);
  const decision = decideNewCustomerDiscount({
    programmeEnabled: demandOk,
    hasReferral: !!referral,
    isSelfReferral: referral?.referrer_user_id === opts.buyerId,
    priorNonRefundedBuyerPurchases: prior,
    itemPence: opts.itemPence,
    minItemPence: settings.minItemPence,
  });
  const referralDiscountPence = decision.eligible ? settings.discountPence : 0;
  const availableCreditPence = settings.creditEnabled
    ? await getAvailableCreditPence(admin, opts.buyerId)
    : 0;

  return {
    referralDiscountPence,
    availableCreditPence,
    applyCredit: settings.creditEnabled && opts.applyCredit,
    hasReferral: !!referral,
    discountEligible: decision.eligible,
    discountReason: decision.reason,
  };
}
