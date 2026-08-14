import type { SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { FulfilmentStatus, FulfilmentMode } from "@/lib/fulfilment";
import { ensureEmailSent, EmailTriggerType, formatGbp } from "@/lib/email-triggers";
import { PackagingSource, STARTER_PACK_EVENTS, trackServerEvent } from "@/lib/starter-pack";
import { getAppUrl } from "@/lib/app-env";
import {
  notifyBuyerConfirmedDelivery,
  notifyFundsReleaseRequiresAction,
} from "@/lib/notification-events";
import { requestSellerFeedback } from "@/lib/seller-review-events";
import { NotificationType, resolveNotifications } from "@/lib/notifications";

const appUrl = getAppUrl();

export type ConfirmReceiptResult =
  | { ok: true; alreadyConfirmed: boolean }
  | { ok: false; status: number; error: string };

type TxRow = {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  amount: number;
  status: string;
  order_state?: string | null;
  fulfilment_status?: string | null;
  fulfilment_mode?: string | null;
  packaging_source?: string | null;
  delivery_issue_reported_at?: string | null;
  buyer_confirmed_at?: string | null;
  completed_at?: string | null;
};

function isManualMode(mode: string | null | undefined): boolean {
  return mode === FulfilmentMode.MANUAL;
}

function isDelivered(tx: TxRow): boolean {
  return (
    tx.fulfilment_status === FulfilmentStatus.DELIVERED ||
    (tx.order_state ?? "").toLowerCase() === "delivered"
  );
}

function isShipped(tx: TxRow): boolean {
  return (
    tx.status === "shipped" ||
    tx.fulfilment_status === FulfilmentStatus.SHIPPED ||
    (tx.order_state ?? "").toLowerCase() === "shipped"
  );
}

export function canConfirmDelivery(tx: TxRow): { ok: true } | { ok: false; error: string } {
  if (tx.status === "complete" || tx.buyer_confirmed_at || tx.completed_at) {
    return { ok: true };
  }
  if (tx.status === "refunded") {
    return { ok: false, error: "This order was refunded" };
  }
  if (tx.status === "dispute") {
    return { ok: false, error: "This order is under review" };
  }
  if (tx.delivery_issue_reported_at) {
    return { ok: false, error: "A delivery issue has already been reported for this order" };
  }
  if (isManualMode(tx.fulfilment_mode)) {
    if (!isShipped(tx) && !isDelivered(tx)) {
      return { ok: false, error: "You can confirm after the seller has dispatched the item" };
    }
    return { ok: true };
  }
  if (!isDelivered(tx)) {
    return { ok: false, error: "You can confirm once delivery has been recorded" };
  }
  if (tx.status !== "shipped" && tx.status !== "pending") {
    return { ok: false, error: "This order cannot be confirmed yet" };
  }
  return { ok: true };
}

async function sellerPayoutsEnabled(
  admin: SupabaseClient,
  sellerId: string
): Promise<boolean | null> {
  try {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return null;
    const stripe = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
    const { data: seller } = await admin
      .from("users")
      .select("stripe_account_id")
      .eq("id", sellerId)
      .maybeSingle();
    if (!seller?.stripe_account_id) return false;
    const account = await stripe.accounts.retrieve(seller.stripe_account_id);
    return account.payouts_enabled === true;
  } catch (e) {
    console.error("sellerPayoutsEnabled check failed", e);
    return null;
  }
}

/**
 * Buyer delivery confirmation. Idempotent. Completes Teevo order state only (destination charges).
 */
export async function confirmBuyerReceipt(
  admin: SupabaseClient,
  opts: { transactionId: string; buyerUserId: string }
): Promise<ConfirmReceiptResult> {
  const { data: tx } = await admin
    .from("transactions")
    .select(
      "id, buyer_id, seller_id, listing_id, amount, status, order_state, fulfilment_status, fulfilment_mode, packaging_source, delivery_issue_reported_at, buyer_confirmed_at, completed_at"
    )
    .eq("id", opts.transactionId)
    .maybeSingle();

  if (!tx || tx.buyer_id !== opts.buyerUserId) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  if (tx.status === "complete" || tx.buyer_confirmed_at || tx.completed_at) {
    return { ok: true, alreadyConfirmed: true };
  }

  const eligibility = canConfirmDelivery(tx as TxRow);
  if (!eligibility.ok) {
    return { ok: false, status: 400, error: eligibility.error };
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await admin
    .from("transactions")
    .update({
      status: "complete",
      order_state: "completed",
      fulfilment_status: FulfilmentStatus.COMPLETED,
      completed_at: now,
      buyer_confirmed_at: now,
      updated_at: now,
    })
    .eq("id", opts.transactionId)
    .in("status", ["shipped", "pending"])
    .is("buyer_confirmed_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    await notifyFundsReleaseRequiresAction(admin, {
      transactionId: opts.transactionId,
      listingId: tx.listing_id,
      reason: error.message,
    });
    return { ok: false, status: 500, error: error.message };
  }

  if (!updated) {
    const { data: again } = await admin
      .from("transactions")
      .select("status, buyer_confirmed_at, completed_at")
      .eq("id", opts.transactionId)
      .single();
    if (again?.status === "complete" || again?.buyer_confirmed_at || again?.completed_at) {
      return { ok: true, alreadyConfirmed: true };
    }
    await notifyFundsReleaseRequiresAction(admin, {
      transactionId: opts.transactionId,
      listingId: tx.listing_id,
      reason: "Order state could not be updated for confirmation.",
    });
    return { ok: false, status: 400, error: "Could not confirm this order" };
  }

  const { data: seller } = await admin.from("users").select("email").eq("id", tx.seller_id).single();
  const { data: listing } = await admin
    .from("listings")
    .select("brand, model, title")
    .eq("id", tx.listing_id)
    .single();
  const itemName = listing
    ? listing.title?.trim() || `${listing.brand} ${listing.model}`
    : "Item";
  const amountGbp = formatGbp(tx.amount);

  if (seller?.email) {
    await ensureEmailSent(admin, {
      emailType: EmailTriggerType.FUNDS_RELEASED,
      referenceId: opts.transactionId,
      recipientId: tx.seller_id,
      to: seller.email,
      subject: `Funds released – £${amountGbp}`,
      type: "transactional",
      variables: {
        title: "Funds released",
        subtitle: "Delivery was confirmed. Funds have been released to your payout account.",
        body: `Order #${opts.transactionId.slice(0, 8)} · ${itemName} · £${amountGbp}`,
        order_number: opts.transactionId.slice(0, 8),
        cta_link: `${appUrl}/dashboard/sales`,
        cta_text: "View sales",
      },
    }).catch((e) => console.error("Funds released email failed", e));
  }

  await notifyBuyerConfirmedDelivery(admin, {
    transactionId: opts.transactionId,
    listingId: tx.listing_id,
    sellerId: tx.seller_id,
    buyerId: tx.buyer_id,
  });

  await requestSellerFeedback(admin, {
    transactionId: opts.transactionId,
    listingId: tx.listing_id,
    buyerId: tx.buyer_id,
    sellerId: tx.seller_id,
  });

  await resolveNotifications(admin, {
    types: [NotificationType.TRANSACTION_STUCK],
    entityId: opts.transactionId,
  });

  if (tx.packaging_source === PackagingSource.TEEVO_STARTER_PACK) {
    await trackServerEvent(admin, STARTER_PACK_EVENTS.ORDER_COMPLETED, {
      userId: tx.buyer_id,
      properties: { transaction_id: opts.transactionId, seller_id: tx.seller_id },
    });
  }

  const payoutsEnabled = await sellerPayoutsEnabled(admin, tx.seller_id);
  if (payoutsEnabled === false) {
    await notifyFundsReleaseRequiresAction(admin, {
      transactionId: opts.transactionId,
      listingId: tx.listing_id,
      reason: "Seller Stripe account is not payout-eligible.",
    });
  }

  return { ok: true, alreadyConfirmed: false };
}
