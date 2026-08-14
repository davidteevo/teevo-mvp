import type { SupabaseClient } from "@supabase/supabase-js";
import { FulfilmentStatus } from "@/lib/fulfilment";
import { NotificationType, notifyAdmins, adminTransactionUrl, getListingTitle } from "@/lib/notifications";
import { sendSellerFeedbackReminders } from "@/lib/seller-review-events";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const SLA = {
  sellerNotDispatchedMs: 48 * HOUR_MS,
  deliveryOverdueMs: 7 * DAY_MS,
  buyerNotConfirmedMs: 48 * HOUR_MS,
  transactionStuckMs: 72 * HOUR_MS,
} as const;

const STUCK_STATUSES = new Set([
  FulfilmentStatus.PAID,
  FulfilmentStatus.PACKAGING_SUBMITTED,
  FulfilmentStatus.PACKAGING_VERIFIED,
  FulfilmentStatus.LABEL_CREATED,
  FulfilmentStatus.SHIPPED,
  FulfilmentStatus.DELIVERED,
]);

function isoAgo(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

async function notifyStuck(
  admin: SupabaseClient,
  type: string,
  title: string,
  message: string,
  transactionId: string
) {
  await notifyAdmins(admin, {
    type,
    title,
    message,
    entityId: transactionId,
    actionUrl: adminTransactionUrl(transactionId),
    actionLabel: "Review transaction",
    requiresAction: true,
  });
}

export async function runNotificationOpsCron(admin: SupabaseClient): Promise<{
  sellerNotDispatched: number;
  deliveryOverdue: number;
  buyerNotConfirmed: number;
  transactionStuck: number;
  feedbackReminders: number;
}> {
  const counts = {
    sellerNotDispatched: 0,
    deliveryOverdue: 0,
    buyerNotConfirmed: 0,
    transactionStuck: 0,
    feedbackReminders: 0,
  };

  const { data: notDispatched } = await admin
    .from("transactions")
    .select("id, listing_id, status, fulfilment_status")
    .eq("status", "pending")
    .not("label_created_at", "is", null)
    .lte("label_created_at", isoAgo(SLA.sellerNotDispatchedMs))
    .limit(100);

  for (const tx of notDispatched ?? []) {
    if (tx.fulfilment_status === FulfilmentStatus.SHIPPED) continue;
    const title = await getListingTitle(admin, tx.listing_id);
    await notifyStuck(
      admin,
      NotificationType.SELLER_NOT_DISPATCHED,
      "Seller hasn't dispatched",
      `The seller hasn't dispatched ${title} within 48 hours of the shipping label being ready.`,
      tx.id
    );
    counts.sellerNotDispatched += 1;
  }

  const { data: overdue } = await admin
    .from("transactions")
    .select("id, listing_id, status, fulfilment_status, order_state")
    .eq("status", "shipped")
    .not("shipped_at", "is", null)
    .lte("shipped_at", isoAgo(SLA.deliveryOverdueMs))
    .limit(100);

  for (const tx of overdue ?? []) {
    if (
      tx.fulfilment_status === FulfilmentStatus.DELIVERED ||
      tx.order_state === "delivered" ||
      tx.fulfilment_status === FulfilmentStatus.COMPLETED
    ) {
      continue;
    }
    const title = await getListingTitle(admin, tx.listing_id);
    await notifyAdmins(admin, {
      type: NotificationType.DELIVERY_OVERDUE,
      title: "Delivery overdue",
      message: `${title} has not been marked delivered within 7 days of dispatch.`,
      entityId: tx.id,
      actionUrl: adminTransactionUrl(tx.id),
      actionLabel: "Review shipment",
      requiresAction: true,
    });
    counts.deliveryOverdue += 1;
  }

  const { data: unconfirmed } = await admin
    .from("transactions")
    .select("id, listing_id, status, fulfilment_status, order_state, buyer_confirmed_at, delivery_issue_reported_at, delivered_at, shipped_at, fulfilment_mode")
    .in("status", ["shipped", "pending"])
    .is("buyer_confirmed_at", null)
    .is("delivery_issue_reported_at", null)
    .limit(150);

  for (const tx of unconfirmed ?? []) {
    const deliveredAt = tx.delivered_at ?? (tx.fulfilment_mode === "manual" ? tx.shipped_at : null);
    if (!deliveredAt) continue;
    if (new Date(deliveredAt).getTime() > Date.now() - SLA.buyerNotConfirmedMs) continue;
    if (
      tx.fulfilment_status !== FulfilmentStatus.DELIVERED &&
      tx.order_state !== "delivered" &&
      tx.fulfilment_mode !== "manual"
    ) {
      continue;
    }
    if (tx.fulfilment_mode === "manual" && tx.status !== "shipped") continue;
    const title = await getListingTitle(admin, tx.listing_id);
    await notifyAdmins(admin, {
      type: NotificationType.BUYER_NOT_CONFIRMED,
      title: "Buyer hasn't confirmed delivery",
      message: `${title} was delivered but the buyer hasn't confirmed within 48 hours.`,
      entityId: tx.id,
      actionUrl: adminTransactionUrl(tx.id),
      actionLabel: "Review transaction",
      requiresAction: true,
    });
    counts.buyerNotConfirmed += 1;
  }

  const { data: stuck } = await admin
    .from("transactions")
    .select("id, listing_id, status, fulfilment_status, packaging_status, fulfilment_status_changed_at")
    .in("status", ["pending", "shipped"])
    .not("fulfilment_status_changed_at", "is", null)
    .lte("fulfilment_status_changed_at", isoAgo(SLA.transactionStuckMs))
    .limit(150);

  for (const tx of stuck ?? []) {
    const fs = tx.fulfilment_status ?? FulfilmentStatus.PAID;
    const isRejected = tx.packaging_status === "REJECTED";
    if (!STUCK_STATUSES.has(fs) && !isRejected) continue;
    if (fs === FulfilmentStatus.COMPLETED) continue;
    const title = await getListingTitle(admin, tx.listing_id);
    await notifyStuck(
      admin,
      NotificationType.TRANSACTION_STUCK,
      "Transaction stuck",
      `${title} has been in the same fulfilment state for over 72 hours.`,
      tx.id
    );
    counts.transactionStuck += 1;
  }

  counts.feedbackReminders = await sendSellerFeedbackReminders(admin);

  return counts;
}
