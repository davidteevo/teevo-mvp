import type { SupabaseClient } from "@supabase/supabase-js";
import { trackServerEvent } from "@/lib/starter-pack";

export const NotificationType = {
  ITEM_SOLD: "item_sold",
  PACKAGING_APPROVED: "packaging_approved",
  PACKAGING_REJECTED: "packaging_rejected",
  SHIPPING_LABEL_READY: "shipping_label_ready",
  READY_TO_SHIP: "ready_to_ship",
  ITEM_DISPATCHED: "item_dispatched",
  ITEM_DELIVERED_AWAITING_CONFIRMATION: "item_delivered_awaiting_confirmation",
  BUYER_CONFIRMED_DELIVERY: "buyer_confirmed_delivery",
  STARTER_PACK_REQUESTED: "starter_pack_requested",
  ORDER_CONFIRMED: "order_confirmed",
  SELLER_DISPATCHED: "seller_dispatched",
  CONFIRM_DELIVERY: "confirm_delivery",
  PACKAGING_REVIEW_REQUIRED: "packaging_review_required",
  PACKAGING_RESUBMITTED: "packaging_resubmitted",
  STARTER_PACK_REQUIRES_SHIPPING: "starter_pack_requires_shipping",
  SHIPPING_LABEL_REQUIRED: "shipping_label_required",
  SHIPPING_LABEL_ISSUE: "shipping_label_issue",
  SELLER_NOT_DISPATCHED: "seller_not_dispatched",
  DELIVERY_ISSUE_REPORTED: "delivery_issue_reported",
  DELIVERY_OVERDUE: "delivery_overdue",
  TRACKING_ISSUE: "tracking_issue",
  BUYER_NOT_CONFIRMED: "buyer_not_confirmed",
  FUNDS_RELEASE_REQUIRES_ACTION: "funds_release_requires_action",
  SELLER_PAYOUT_FAILED: "seller_payout_failed",
  SELLER_PAYOUT_ACCOUNT_ISSUE: "seller_payout_account_issue",
  PAYMENT_ISSUE_REQUIRES_REVIEW: "payment_issue_requires_review",
  REFUND_REQUIRES_ACTION: "refund_requires_action",
  TRANSACTION_STUCK: "transaction_stuck",
  LISTING_REVIEW_REQUIRED: "listing_review_required",
  WATCHLIST_NOW_AVAILABLE: "watchlist_now_available",
  WATCHLIST_PRICE_DROP: "watchlist_price_drop",
  WATCHLIST_SOLD: "watchlist_sold",
  WATCHLIST_UNAVAILABLE: "watchlist_unavailable",
  LEAVE_SELLER_FEEDBACK: "leave_seller_feedback",
  NEW_SELLER_FEEDBACK: "new_seller_feedback",
  FEEDBACK_REQUIRES_REVIEW: "feedback_requires_review",
} as const;

export type NotificationTypeValue = (typeof NotificationType)[keyof typeof NotificationType];

export const NotificationEntityType = {
  TRANSACTION: "transaction",
  LISTING: "listing",
  ACCOUNT: "account",
  REVIEW: "review",
} as const;

export type NotificationEntityTypeValue =
  (typeof NotificationEntityType)[keyof typeof NotificationEntityType];

export type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  entity_type: string;
  entity_id: string;
  action_url: string | null;
  action_label: string | null;
  requires_action: boolean;
  action_completed_at: string | null;
  read_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export async function getListingTitle(
  admin: SupabaseClient,
  listingId: string | null | undefined
): Promise<string> {
  if (!listingId) return "your club";
  const { data } = await admin
    .from("listings")
    .select("title, brand, model")
    .eq("id", listingId)
    .maybeSingle();
  if (!data) return "your club";
  const named =
    (typeof data.title === "string" && data.title.trim()) ||
    [data.brand, data.model].filter(Boolean).join(" ").trim();
  return named || "your club";
}

export async function getAdminUserIds(admin: SupabaseClient): Promise<string[]> {
  const { data, error } = await admin.from("users").select("id").eq("role", "admin");
  if (error) {
    console.error("getAdminUserIds failed", error);
    return [];
  }
  return (data ?? []).map((u) => u.id).filter(Boolean);
}

export type CreateNotificationOpts = {
  userId: string;
  type: NotificationTypeValue | string;
  title: string;
  message: string;
  entityType?: NotificationEntityTypeValue | string;
  entityId: string;
  actionUrl?: string | null;
  actionLabel?: string | null;
  requiresAction?: boolean;
  metadata?: Record<string, unknown>;
};

/**
 * Idempotent create. Never throws — notification failure must not block transactions.
 */
export async function createNotification(
  admin: SupabaseClient,
  opts: CreateNotificationOpts
): Promise<string | null> {
  try {
    const requiresAction = opts.requiresAction === true;
    const entityType = opts.entityType ?? NotificationEntityType.TRANSACTION;

    let existingQuery = admin
      .from("notifications")
      .select("id")
      .eq("user_id", opts.userId)
      .eq("type", opts.type)
      .eq("entity_id", opts.entityId);

    if (requiresAction) {
      existingQuery = existingQuery.is("action_completed_at", null);
    }

    const { data: existing } = await existingQuery.maybeSingle();
    if (existing?.id) return existing.id;

    const { data, error } = await admin
      .from("notifications")
      .insert({
        user_id: opts.userId,
        type: opts.type,
        title: opts.title,
        message: opts.message,
        entity_type: entityType,
        entity_id: opts.entityId,
        action_url: opts.actionUrl ?? null,
        action_label: opts.actionLabel ?? null,
        requires_action: requiresAction,
        metadata: opts.metadata ?? {},
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") return null;
      console.error("createNotification failed", error);
      return null;
    }

    await trackServerEvent(admin, "notification_created", {
      userId: opts.userId,
      properties: {
        notification_type: opts.type,
        entity_type: entityType,
        entity_id: opts.entityId,
        requires_action: requiresAction,
      },
    });

    return data?.id ?? null;
  } catch (e) {
    console.error("createNotification failed", e);
    return null;
  }
}

export async function resolveNotifications(
  admin: SupabaseClient,
  opts: {
    types: string[];
    entityId: string;
    userId?: string | null;
  }
): Promise<number> {
  try {
    if (!opts.types.length) return 0;
    const now = new Date().toISOString();
    let query = admin
      .from("notifications")
      .update({ action_completed_at: now })
      .in("type", opts.types)
      .eq("entity_id", opts.entityId)
      .is("action_completed_at", null);

    if (opts.userId) {
      query = query.eq("user_id", opts.userId);
    }

    const { data, error } = await query.select("id, user_id, type, entity_type");
    if (error) {
      console.error("resolveNotifications failed", error);
      return 0;
    }
    const rows = data ?? [];
    for (const row of rows) {
      await trackServerEvent(admin, "notification_action_completed", {
        userId: row.user_id,
        properties: {
          notification_type: row.type,
          entity_type: row.entity_type,
          entity_id: opts.entityId,
        },
      });
    }
    return rows.length;
  } catch (e) {
    console.error("resolveNotifications failed", e);
    return 0;
  }
}

export async function notifyAdmins(
  admin: SupabaseClient,
  opts: Omit<CreateNotificationOpts, "userId">
): Promise<number> {
  const ids = await getAdminUserIds(admin);
  let created = 0;
  for (const userId of ids) {
    const id = await createNotification(admin, { ...opts, userId });
    if (id) created += 1;
  }
  return created;
}

export function salesUrl(txId: string): string {
  return `/dashboard/sales?id=${encodeURIComponent(txId)}`;
}

export function purchasesUrl(txId: string): string {
  return `/dashboard/purchases?id=${encodeURIComponent(txId)}`;
}

export function confirmDeliveryUrl(txId: string): string {
  return `/dashboard/purchases/${txId}/confirm`;
}

export function adminPackagingUrl(txId: string): string {
  return `/dashboard/admin/packaging?id=${encodeURIComponent(txId)}`;
}

export function adminStarterPackUrl(txId: string): string {
  return `/admin/starter-packs?id=${encodeURIComponent(txId)}`;
}

export function adminFulfilmentUrl(txId: string): string {
  return `/admin/fulfilment?id=${encodeURIComponent(txId)}`;
}

export function adminTransactionUrl(txId: string): string {
  return `/admin/transactions?id=${encodeURIComponent(txId)}`;
}

export function adminListingUrl(listingId: string): string {
  return `/admin/listings/${encodeURIComponent(listingId)}`;
}

export function feedbackUrl(transactionId: string): string {
  return `/feedback/${encodeURIComponent(transactionId)}`;
}

export function sellerUrl(sellerId: string, reviewId?: string | null): string {
  const base = `/seller/${encodeURIComponent(sellerId)}`;
  return reviewId ? `${base}#review-${encodeURIComponent(reviewId)}` : base;
}

export function adminFeedbackUrl(reviewId: string): string {
  return `/admin/feedback/${encodeURIComponent(reviewId)}`;
}
