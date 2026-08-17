import type { SupabaseClient } from "@supabase/supabase-js";

export type CreditType =
  | "referral_buyer_reward"
  | "seller_listing_referral"
  | "seller_sale_referral"
  | "admin_adjustment"
  | "redemption"
  | "reversal";

export type CreditStatus = "pending" | "available" | "redeemed" | "reversed" | "cancelled";

const BALANCE_STATUSES = new Set<CreditStatus>(["available", "redeemed"]);

export function creditBalanceFromRows(
  rows: { amount_pence: number; status: string; expires_at?: string | null }[],
  now = new Date()
): number {
  const nowMs = now.getTime();
  let sum = 0;
  for (const row of rows) {
    if (!BALANCE_STATUSES.has(row.status as CreditStatus)) continue;
    if (row.expires_at && new Date(row.expires_at).getTime() <= nowMs && row.status === "available") {
      continue;
    }
    sum += row.amount_pence;
  }
  return Math.max(0, sum);
}

export async function getAvailableCreditPence(
  admin: SupabaseClient,
  userId: string,
  now = new Date()
): Promise<number> {
  const { data, error } = await admin
    .from("credit_transactions")
    .select("amount_pence, status, expires_at")
    .eq("user_id", userId)
    .in("status", ["available", "redeemed"]);
  if (error) {
    console.error("getAvailableCreditPence failed", error);
    return 0;
  }
  return creditBalanceFromRows(data ?? [], now);
}

export async function insertCreditTransaction(
  admin: SupabaseClient,
  row: {
    userId: string;
    amountPence: number;
    type: CreditType;
    status: CreditStatus;
    referralRewardId?: string | null;
    relatedTransactionId?: string | null;
    expiresAt?: string | null;
    adminNotes?: string | null;
    approvedAt?: string | null;
  }
): Promise<{ id: string } | null> {
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("credit_transactions")
    .insert({
      user_id: row.userId,
      amount_pence: row.amountPence,
      type: row.type,
      status: row.status,
      referral_reward_id: row.referralRewardId ?? null,
      related_transaction_id: row.relatedTransactionId ?? null,
      expires_at: row.expiresAt ?? null,
      admin_notes: row.adminNotes ?? null,
      approved_at: row.approvedAt ?? (row.status === "available" ? now : null),
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .maybeSingle();
  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      const { data: existing } = await admin
        .from("credit_transactions")
        .select("id")
        .eq("related_transaction_id", row.relatedTransactionId ?? "")
        .eq("type", row.type)
        .maybeSingle();
      return existing?.id ? { id: existing.id } : null;
    }
    console.error("insertCreditTransaction failed", error);
    return null;
  }
  return data?.id ? { id: data.id } : null;
}

export async function reverseAvailableCreditForReward(
  admin: SupabaseClient,
  rewardId: string
): Promise<void> {
  const now = new Date().toISOString();
  const { data: issued } = await admin
    .from("credit_transactions")
    .select("id, user_id, amount_pence, status")
    .eq("referral_reward_id", rewardId)
    .in("type", ["referral_buyer_reward", "seller_listing_referral", "seller_sale_referral"])
    .maybeSingle();
  if (!issued) return;
  if (issued.status === "available") {
    await admin
      .from("credit_transactions")
      .update({ status: "reversed", updated_at: now })
      .eq("id", issued.id)
      .eq("status", "available");
    await insertCreditTransaction(admin, {
      userId: issued.user_id,
      amountPence: -Math.abs(issued.amount_pence),
      type: "reversal",
      status: "reversed",
      referralRewardId: rewardId,
      adminNotes: "Reward reversed",
    });
  }
}

export async function reverseRedemptionForTransaction(
  admin: SupabaseClient,
  transactionId: string
): Promise<void> {
  const now = new Date().toISOString();
  const { data: redemption } = await admin
    .from("credit_transactions")
    .select("id, user_id, amount_pence, status")
    .eq("related_transaction_id", transactionId)
    .eq("type", "redemption")
    .maybeSingle();
  if (!redemption || redemption.status !== "redeemed") return;
  await admin
    .from("credit_transactions")
    .update({ status: "reversed", updated_at: now })
    .eq("id", redemption.id)
    .eq("status", "redeemed");
  await insertCreditTransaction(admin, {
    userId: redemption.user_id,
    amountPence: Math.abs(redemption.amount_pence),
    type: "reversal",
    status: "available",
    relatedTransactionId: transactionId,
    adminNotes: "Credit restored after order refund",
    approvedAt: now,
  });
}
