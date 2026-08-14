import type { SupabaseClient } from "@supabase/supabase-js";

export const TransactionEventType = {
  ORDER_CREATED: "order_created",
  DISPATCH_DEADLINE_CREATED: "dispatch_deadline_created",
  DEADLINE_CHANGED: "deadline_changed",
  REMINDER_SENT: "reminder_sent",
  EXTENSION_REQUESTED: "extension_requested",
  EXTENSION_APPROVED: "extension_approved",
  EXTENSION_DECLINED: "extension_declined",
  EXTENSION_SUPERSEDED: "extension_superseded",
  SELLER_DISPATCHED: "seller_dispatched",
  DEADLINE_EXPIRED: "deadline_expired",
  CANCELLATION_INITIATED: "cancellation_initiated",
  CANCELLATION_COMPLETED: "cancellation_completed",
  REFUND_INITIATED: "refund_initiated",
  REFUND_COMPLETED: "refund_completed",
  REFUND_FAILED: "refund_failed",
  AVAILABILITY_CONFIRMATION_REQUESTED: "availability_confirmation_requested",
  LISTING_REACTIVATED: "listing_reactivated",
  LISTING_MARKED_UNAVAILABLE: "listing_marked_unavailable",
  ADMIN_OVERRIDE: "admin_override",
} as const;

export type TransactionEventTypeValue =
  (typeof TransactionEventType)[keyof typeof TransactionEventType];

export async function recordTransactionEvent(
  admin: SupabaseClient,
  opts: {
    transactionId: string;
    eventType: TransactionEventTypeValue | string;
    actorId?: string | null;
    payload?: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await admin.from("transaction_events").insert({
    transaction_id: opts.transactionId,
    event_type: opts.eventType,
    actor_id: opts.actorId ?? null,
    payload: opts.payload ?? {},
  });
  if (error) {
    console.error("recordTransactionEvent failed", opts.eventType, error);
  }
}
