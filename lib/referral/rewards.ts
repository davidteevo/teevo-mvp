import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getAvailableCreditPence,
  insertCreditTransaction,
  reverseAvailableCreditForReward,
  reverseRedemptionForTransaction,
  type CreditType,
} from "@/lib/referral/credit";
import { creditExpiresAt, getReferralSettings } from "@/lib/referral/settings";
import { getReferralForUser, type ReferralRow } from "@/lib/referral/attribution";
import { decideNewCustomerDiscount } from "@/lib/referral/eligibility";
import { trackServerEvent } from "@/lib/starter-pack";
import { notifyReferralRewardApproved } from "@/lib/referral/notify";
import {
  ReferralRewardStatus,
  ReferralRewardType,
  type ReferralRewardTypeValue,
} from "@/lib/referral/types";

export { ReferralRewardStatus, ReferralRewardType, type ReferralRewardTypeValue };

function creditTypeForReward(rewardType: ReferralRewardTypeValue): CreditType | null {
  if (rewardType === ReferralRewardType.BUYER_REFERRER_CREDIT) return "referral_buyer_reward";
  if (rewardType === ReferralRewardType.SELLER_LISTING_CREDIT) return "seller_listing_referral";
  if (rewardType === ReferralRewardType.SELLER_SALE_CREDIT) return "seller_sale_referral";
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
    .select("referrer_user_id, creator_id")
    .eq("id", reward.referral_id)
    .maybeSingle();

  if (reward.reward_type !== ReferralRewardType.CREATOR_COMMISSION && referral?.referrer_user_id) {
    await issueAvailableCredit(admin, {
      rewardId,
      rewardType: reward.reward_type as ReferralRewardTypeValue,
      userId: referral.referrer_user_id,
      amountPence: reward.amount_pence,
      relatedTransactionId: reward.related_transaction_id,
    });
    await notifyReferralRewardApproved(admin, {
      referrerUserId: referral.referrer_user_id,
      rewardId,
      rewardType: reward.reward_type as ReferralRewardTypeValue,
      amountPence: reward.amount_pence,
    }).catch((e) => console.error("notifyReferralRewardApproved failed", e));
  }

  await trackServerEvent(admin, "referral_reward_approved", {
    userId: referral?.referrer_user_id,
    properties: {
      reward_id: rewardId,
      reward_type: reward.reward_type,
      amount_pence: reward.amount_pence,
    },
  });
  if (reward.reward_type === ReferralRewardType.CREATOR_COMMISSION) {
    await trackServerEvent(admin, "creator_referral_conversion", {
      properties: {
        reward_id: rewardId,
        referral_id: reward.referral_id,
        creator_id: referral?.creator_id,
        amount_pence: reward.amount_pence,
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
    settings: Awaited<ReturnType<typeof getReferralSettings>>;
  }
): Promise<void> {
  const prior = await countPriorBuyerPurchases(admin, opts.buyerId, opts.transactionId);
  const decision = decideNewCustomerDiscount({
    programmeEnabled: opts.settings.programmeEnabled,
    hasReferral: true,
    isSelfReferral: opts.referral.referrer_user_id === opts.buyerId,
    priorNonRefundedBuyerPurchases: prior,
    itemPence: opts.itemPence,
    minItemPence: opts.settings.minItemPence,
  });
  if (!decision.eligible && !opts.discountApplied) return;

  if (opts.referral.creator_id) {
    if (!opts.settings.creatorEnabled) return;
    const { data: creator } = await admin
      .from("creators")
      .select("id, status, commission_pence")
      .eq("id", opts.referral.creator_id)
      .maybeSingle();
    if (!creator || creator.status !== "active") return;
    await createPendingReward(admin, {
      referralId: opts.referral.id,
      rewardType: ReferralRewardType.CREATOR_COMMISSION,
      amountPence: creator.commission_pence,
      relatedTransactionId: opts.transactionId,
    });
  } else {
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
  if (!settings.sellerEnabled) return;
  const referral = await getReferralForUser(admin, opts.sellerId);
  if (!referral) return;

  const exists = await hasExistingReward(admin, referral.id, ReferralRewardType.SELLER_LISTING_CREDIT);
  if (exists) return;

  const created = await createPendingReward(admin, {
    referralId: referral.id,
    rewardType: ReferralRewardType.SELLER_LISTING_CREDIT,
    amountPence: settings.sellerListingRewardPence,
    relatedListingId: opts.listingId,
  });
  if (!created) return;
  await approveReward(admin, created.id);
  await trackServerEvent(admin, "referral_first_listing", {
    userId: opts.sellerId,
    properties: { referral_id: referral.id, listing_id: opts.listingId },
  });
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
  const prior = await countPriorBuyerPurchases(admin, opts.buyerId);
  const decision = decideNewCustomerDiscount({
    programmeEnabled: settings.programmeEnabled,
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
