import type { SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { FulfilmentStatus } from "@/lib/fulfilment";
import {
  AvailabilityConfirmationStatus,
  CancellationReason,
  CancellationStatus,
  DispatchExtensionStatus,
  dispatchCancelEligibility,
  isDispatchClockPaused,
  type CancellationReasonType,
  type DispatchClockRow,
} from "@/lib/dispatch-deadline";
import {
  notifyDispatchCancellationFailed,
  notifyDispatchTimeoutCancelled,
} from "@/lib/dispatch-notifications";
import { refundShippoLabel } from "@/lib/shippo";
import { trackServerEvent } from "@/lib/starter-pack";
import { recordTransactionEvent, TransactionEventType } from "@/lib/transaction-events";

const CANCEL_SELECT =
  "id, listing_id, buyer_id, seller_id, status, shipped_at, stripe_payment_id, stripe_refund_id, shippo_transaction_id, dispatch_deadline_at, dispatch_clock_paused_at, dispatch_clock_pause_reason, cancellation_status, cancellation_reason, cancelled_at, packaging_source, starter_pack_dispatched_at, packaging_status, fulfilment_mode, fulfilment_status, shippo_label_url, shipping_label_url, dispatch_extension_status";

function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });
}

async function findExistingRefund(stripe: Stripe, paymentIntentId: string): Promise<Stripe.Refund | null> {
  const list = await stripe.refunds.list({ payment_intent: paymentIntentId, limit: 20 });
  return (
    list.data.find((r) => r.status === "succeeded" || r.status === "pending" || r.status === "requires_action") ??
    null
  );
}

export async function markExtensionSupersededOnDispatch(
  admin: SupabaseClient,
  tx: { id: string; dispatch_extension_status?: string | null }
): Promise<void> {
  if (tx.dispatch_extension_status !== DispatchExtensionStatus.REQUESTED) return;
  await admin
    .from("transactions")
    .update({
      dispatch_extension_status: DispatchExtensionStatus.SUPERSEDED,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tx.id)
    .eq("dispatch_extension_status", DispatchExtensionStatus.REQUESTED);
  await recordTransactionEvent(admin, {
    transactionId: tx.id,
    eventType: TransactionEventType.EXTENSION_SUPERSEDED,
    payload: { reason: "seller_dispatched" },
  });
}

export type CancelUndispatchedResult =
  | { ok: true; alreadyCompleted: true }
  | { ok: true; alreadyCompleted: false; refundId: string | null }
  | { ok: false; error: string; retryable: boolean };

export async function cancelUndispatchedOrder(
  admin: SupabaseClient,
  opts: {
    transactionId: string;
    reason: CancellationReasonType;
    actorId?: string | null;
    skipDeadlineCheck?: boolean;
  }
): Promise<CancelUndispatchedResult> {
  const now = new Date();
  const nowIso = now.toISOString();

  const { data: existing, error: fetchErr } = await admin
    .from("transactions")
    .select(CANCEL_SELECT)
    .eq("id", opts.transactionId)
    .maybeSingle();
  if (fetchErr || !existing) {
    return { ok: false, error: fetchErr?.message ?? "Transaction not found", retryable: false };
  }

  if (existing.cancellation_status === CancellationStatus.COMPLETED) {
    return { ok: true, alreadyCompleted: true };
  }
  const eligibility = dispatchCancelEligibility(existing as DispatchClockRow, {
    now,
    skipDeadlineCheck: opts.skipDeadlineCheck,
  });
  if (!eligibility.ok) return eligibility;

  const { data: claimed, error: claimErr } = await admin
    .from("transactions")
    .update({
      cancellation_status: CancellationStatus.IN_PROGRESS,
      cancellation_reason: opts.reason,
      updated_at: nowIso,
    })
    .eq("id", opts.transactionId)
    .eq("status", "pending")
    .is("shipped_at", null)
    .or(
      "cancellation_status.is.null,cancellation_status.eq.failed,cancellation_status.eq.in_progress"
    )
    .select(CANCEL_SELECT)
    .maybeSingle();

  if (claimErr) {
    console.error("cancelUndispatchedOrder claim failed", claimErr);
    return { ok: false, error: claimErr.message, retryable: true };
  }
  if (!claimed) {
    const { data: again } = await admin.from("transactions").select(CANCEL_SELECT).eq("id", opts.transactionId).maybeSingle();
    if (again?.cancellation_status === CancellationStatus.COMPLETED || again?.status === "refunded") {
      return { ok: true, alreadyCompleted: true };
    }
    if (again?.shipped_at || again?.status === "shipped") {
      return { ok: false, error: "Order has already been dispatched", retryable: false };
    }
    return { ok: false, error: "Could not claim order for cancellation", retryable: true };
  }

  const tx = claimed;
  if (tx.shipped_at || tx.status !== "pending") {
    await admin
      .from("transactions")
      .update({ cancellation_status: null, cancellation_reason: null, updated_at: nowIso })
      .eq("id", tx.id)
      .eq("cancellation_status", CancellationStatus.IN_PROGRESS);
    return { ok: false, error: "Order is no longer eligible", retryable: false };
  }
  if (!opts.skipDeadlineCheck && isDispatchClockPaused(tx as DispatchClockRow)) {
    await admin
      .from("transactions")
      .update({ cancellation_status: null, cancellation_reason: null, updated_at: nowIso })
      .eq("id", tx.id)
      .eq("cancellation_status", CancellationStatus.IN_PROGRESS);
    return { ok: false, error: "Dispatch clock is paused", retryable: true };
  }

  await recordTransactionEvent(admin, {
    transactionId: tx.id,
    eventType: TransactionEventType.DEADLINE_EXPIRED,
    actorId: opts.actorId,
    payload: { reason: opts.reason, dispatch_deadline_at: tx.dispatch_deadline_at },
  });
  await recordTransactionEvent(admin, {
    transactionId: tx.id,
    eventType: TransactionEventType.CANCELLATION_INITIATED,
    actorId: opts.actorId,
    payload: { reason: opts.reason },
  });

  let refundId: string | null = tx.stripe_refund_id ?? null;
  const paymentIntentId = tx.stripe_payment_id as string | null;

  if (!paymentIntentId) {
    await failCancellation(admin, tx.id, "Missing payment reference", opts);
    return { ok: false, error: "Missing payment reference", retryable: false };
  }

  try {
    const stripe = getStripe();
    const existingRefund = refundId
      ? await stripe.refunds.retrieve(refundId).catch(() => null)
      : await findExistingRefund(stripe, paymentIntentId);

    let refund = existingRefund;
    if (!refund || (refund.status !== "succeeded" && refund.status !== "pending")) {
      await recordTransactionEvent(admin, {
        transactionId: tx.id,
        eventType: TransactionEventType.REFUND_INITIATED,
        actorId: opts.actorId,
        payload: { payment_intent: paymentIntentId },
      });
      refund = await stripe.refunds.create(
        {
          payment_intent: paymentIntentId,
          reverse_transfer: true,
          refund_application_fee: true,
          metadata: {
            teevo_reason: opts.reason,
            transaction_id: tx.id,
          },
        },
        { idempotencyKey: `dispatch-timeout-refund-${tx.id}` }
      );
    }
    refundId = refund.id;
    await admin
      .from("transactions")
      .update({ stripe_refund_id: refundId, updated_at: new Date().toISOString() })
      .eq("id", tx.id);

    if (refund.status === "failed" || refund.status === "canceled") {
      await failCancellation(admin, tx.id, `Stripe refund ${refund.status}`, opts, refundId);
      return { ok: false, error: `Stripe refund ${refund.status}`, retryable: true };
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stripe refund failed";
    await failCancellation(admin, tx.id, message, opts, refundId);
    return { ok: false, error: message, retryable: true };
  }

  const completedAt = new Date().toISOString();
  const { data: completed, error: completeErr } = await admin
    .from("transactions")
    .update({
      status: "refunded",
      order_state: "cancelled",
      fulfilment_status: FulfilmentStatus.CANCELLED,
      cancelled_at: completedAt,
      cancellation_status: CancellationStatus.COMPLETED,
      cancellation_reason: opts.reason,
      stripe_refund_id: refundId,
      dispatch_clock_paused_at: null,
      dispatch_clock_pause_reason: null,
      updated_at: completedAt,
    })
    .eq("id", tx.id)
    .eq("status", "pending")
    .is("shipped_at", null)
    .select("id")
    .maybeSingle();

  if (completeErr || !completed) {
    await failCancellation(
      admin,
      tx.id,
      completeErr?.message ?? "Order state changed before cancellation could complete",
      opts,
      refundId
    );
    return { ok: false, error: "Order state changed before cancellation could complete", retryable: true };
  }

  if (tx.dispatch_extension_status === DispatchExtensionStatus.REQUESTED) {
    await admin
      .from("transactions")
      .update({
        dispatch_extension_status: DispatchExtensionStatus.SUPERSEDED,
        updated_at: completedAt,
      })
      .eq("id", tx.id)
      .eq("dispatch_extension_status", DispatchExtensionStatus.REQUESTED);
  }

  try {
    const { error: listingErr } = await admin
      .from("listings")
      .update({
        availability_confirmation_status: AvailabilityConfirmationStatus.REQUIRED,
        updated_at: completedAt,
      })
      .eq("id", tx.listing_id);
    if (listingErr) {
      await notifyDispatchCancellationFailed(admin, {
        transactionId: tx.id,
        listingId: tx.listing_id,
        detail: `Order refunded but listing could not move to availability confirmation: ${listingErr.message}`,
      });
    } else {
      await recordTransactionEvent(admin, {
        transactionId: tx.id,
        eventType: TransactionEventType.AVAILABILITY_CONFIRMATION_REQUESTED,
        payload: { listing_id: tx.listing_id },
      });
    }
  } catch (e) {
    await notifyDispatchCancellationFailed(admin, {
      transactionId: tx.id,
      listingId: tx.listing_id,
      detail: e instanceof Error ? e.message : "Listing transition failed",
    });
  }

  if (tx.shippo_transaction_id) {
    await refundShippoLabel(tx.shippo_transaction_id);
  }

  await recordTransactionEvent(admin, {
    transactionId: tx.id,
    eventType: TransactionEventType.REFUND_COMPLETED,
    actorId: opts.actorId,
    payload: { stripe_refund_id: refundId },
  });
  await recordTransactionEvent(admin, {
    transactionId: tx.id,
    eventType: TransactionEventType.CANCELLATION_COMPLETED,
    actorId: opts.actorId,
    payload: { reason: opts.reason },
  });
  await trackServerEvent(admin, "dispatch_timeout_cancelled", {
    userId: tx.seller_id,
    properties: {
      transaction_id: tx.id,
      listing_id: tx.listing_id,
      reason: opts.reason,
    },
  });
  await trackServerEvent(admin, "dispatch_refund_succeeded", {
    userId: tx.seller_id,
    properties: { transaction_id: tx.id, stripe_refund_id: refundId },
  });

  await notifyDispatchTimeoutCancelled(admin, {
    transactionId: tx.id,
    listingId: tx.listing_id,
    sellerId: tx.seller_id,
    buyerId: tx.buyer_id,
  });

  return { ok: true, alreadyCompleted: false, refundId };
}

async function failCancellation(
  admin: SupabaseClient,
  transactionId: string,
  detail: string,
  opts: { actorId?: string | null; reason?: string },
  refundId?: string | null
): Promise<void> {
  const now = new Date().toISOString();
  await admin
    .from("transactions")
    .update({
      cancellation_status: CancellationStatus.FAILED,
      stripe_refund_id: refundId ?? undefined,
      updated_at: now,
    })
    .eq("id", transactionId)
    .neq("cancellation_status", CancellationStatus.COMPLETED);
  await recordTransactionEvent(admin, {
    transactionId,
    eventType: TransactionEventType.REFUND_FAILED,
    actorId: opts.actorId,
    payload: { detail },
  });
  await trackServerEvent(admin, "dispatch_refund_failed", {
    properties: { transaction_id: transactionId, detail },
  });
  const { data: tx } = await admin
    .from("transactions")
    .select("listing_id")
    .eq("id", transactionId)
    .maybeSingle();
  await notifyDispatchCancellationFailed(admin, {
    transactionId,
    listingId: tx?.listing_id,
    detail,
  });
}

export { CancellationReason };
