import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addCalendarDays,
  calendarDaysBetween,
} from "@/lib/business-days";
import { getDispatchDeadlineDays } from "@/lib/dispatch-settings";
import { FulfilmentMode, hasShippingLabel } from "@/lib/fulfilment-providers";
import { FulfilmentStatus, PackagingStatus } from "@/lib/fulfilment";
import { PackagingSource } from "@/lib/starter-pack";
import { recordTransactionEvent, TransactionEventType } from "@/lib/transaction-events";
export const DispatchClockPauseReason = {
  STARTER_PACK: "starter_pack",
  PACKAGING_REVIEW: "packaging_review",
  MANUAL_LABEL: "manual_label",
} as const;
export type DispatchClockPauseReasonType =
  (typeof DispatchClockPauseReason)[keyof typeof DispatchClockPauseReason];

export const DispatchExtensionStatus = {
  REQUESTED: "requested",
  APPROVED: "approved",
  DECLINED: "declined",
  SUPERSEDED: "superseded",
} as const;
export type DispatchExtensionStatusType =
  (typeof DispatchExtensionStatus)[keyof typeof DispatchExtensionStatus];

export const CancellationReason = {
  SELLER_DISPATCH_TIMEOUT: "seller_dispatch_timeout",
  ADMIN_OVERRIDE: "admin_override",
} as const;
export type CancellationReasonType = (typeof CancellationReason)[keyof typeof CancellationReason];

export const CancellationStatus = {
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;
export type CancellationStatusType = (typeof CancellationStatus)[keyof typeof CancellationStatus];

export const AvailabilityConfirmationStatus = {
  REQUIRED: "required",
  CONFIRMED_AVAILABLE: "confirmed_available",
  CONFIRMED_UNAVAILABLE: "confirmed_unavailable",
} as const;
export type AvailabilityConfirmationStatusType =
  (typeof AvailabilityConfirmationStatus)[keyof typeof AvailabilityConfirmationStatus];

export const DISPATCH_CLOCK_SELECT =
  "id, status, shipped_at, cancellation_status, packaging_source, starter_pack_dispatched_at, packaging_status, fulfilment_mode, fulfilment_status, shippo_label_url, shipping_label_url, dispatch_deadline_at, original_dispatch_deadline_at, dispatch_clock_paused_at, dispatch_clock_pause_reason, created_at, dispatch_extension_status";

export type DispatchClockRow = {
  id: string;
  status?: string | null;
  shipped_at?: string | null;
  cancellation_status?: string | null;
  packaging_source?: string | null;
  starter_pack_dispatched_at?: string | null;
  packaging_status?: string | null;
  fulfilment_mode?: string | null;
  fulfilment_status?: string | null;
  shippo_label_url?: string | null;
  shipping_label_url?: string | null;
  dispatch_deadline_at?: string | null;
  original_dispatch_deadline_at?: string | null;
  dispatch_clock_paused_at?: string | null;
  dispatch_clock_pause_reason?: string | null;
  created_at?: string | null;
  dispatch_extension_status?: string | null;
};

export function pauseReasonFor(tx: DispatchClockRow): DispatchClockPauseReasonType | null {
  if (tx.packaging_source === PackagingSource.TEEVO_STARTER_PACK && !tx.starter_pack_dispatched_at) {
    return DispatchClockPauseReason.STARTER_PACK;
  }
  if (tx.packaging_status === PackagingStatus.SUBMITTED) {
    return DispatchClockPauseReason.PACKAGING_REVIEW;
  }
  if (
    tx.fulfilment_mode === FulfilmentMode.MANUAL &&
    tx.fulfilment_status === FulfilmentStatus.PACKAGING_VERIFIED &&
    !hasShippingLabel(tx)
  ) {
    return DispatchClockPauseReason.MANUAL_LABEL;
  }
  return null;
}

export function isDispatchClockPaused(tx: DispatchClockRow): boolean {
  return pauseReasonFor(tx) != null;
}

export function isCancellationBlockingDispatch(
  cancellationStatus: string | null | undefined
): boolean {
  return (
    cancellationStatus === CancellationStatus.IN_PROGRESS ||
    cancellationStatus === CancellationStatus.COMPLETED
  );
}

export function isDispatchEnforcementOpen(tx: DispatchClockRow): boolean {
  if ((tx.status ?? "").toLowerCase() !== "pending") return false;
  if (tx.shipped_at) return false;
  if (isCancellationBlockingDispatch(tx.cancellation_status)) return false;
  return true;
}

/** Pure eligibility for auto-cancel. Does not perform the claim or refund. */
export function dispatchCancelEligibility(
  tx: DispatchClockRow,
  opts: { now?: Date; skipDeadlineCheck?: boolean } = {}
): { ok: true } | { ok: false; error: string; retryable: boolean } {
  const status = (tx.status ?? "").toLowerCase();
  if (status === "shipped" || status === "complete" || tx.shipped_at) {
    return { ok: false, error: "Order has already been dispatched", retryable: false };
  }
  if (status === "dispute") {
    return { ok: false, error: "Order is in dispute", retryable: false };
  }
  if (tx.cancellation_status === CancellationStatus.COMPLETED) {
    return { ok: false, error: "Cancellation already completed", retryable: false };
  }
  if (status === "refunded") {
    return { ok: false, error: "Order is already refunded", retryable: false };
  }
  if (!opts.skipDeadlineCheck && isDispatchClockPaused(tx)) {
    return { ok: false, error: "Dispatch clock is paused", retryable: true };
  }
  const now = opts.now ?? new Date();
  if (
    !opts.skipDeadlineCheck &&
    tx.dispatch_deadline_at &&
    now.getTime() <= new Date(tx.dispatch_deadline_at).getTime()
  ) {
    return { ok: false, error: "Deadline has not passed", retryable: true };
  }
  if (
    !isDispatchEnforcementOpen(tx) &&
    tx.cancellation_status !== CancellationStatus.FAILED &&
    tx.cancellation_status !== CancellationStatus.IN_PROGRESS
  ) {
    return { ok: false, error: "Order is not eligible for dispatch cancellation", retryable: false };
  }
  return { ok: true };
}

export function shouldSendAfterPurchaseReminder(opts: {
  reminderAlreadySent: boolean;
  createdAt: Date;
  deadline: Date;
  now: Date;
}): boolean {
  if (opts.reminderAlreadySent) return false;
  if (opts.now.getTime() > opts.deadline.getTime()) return false;
  return calendarDaysBetween(opts.createdAt, opts.now) >= 2;
}

export function computeInitialDispatchDeadline(
  createdAt: Date,
  days: number
): { original: Date; active: Date } {
  const deadline = addCalendarDays(createdAt, days);
  return { original: deadline, active: deadline };
}

export async function ensureDispatchDeadline(
  admin: SupabaseClient,
  tx: DispatchClockRow,
  now: Date = new Date()
): Promise<DispatchClockRow> {
  if (tx.dispatch_deadline_at && tx.original_dispatch_deadline_at) return tx;
  const createdAt = tx.created_at ? new Date(tx.created_at) : now;
  const days = await getDispatchDeadlineDays(admin);
  const { original, active } = computeInitialDispatchDeadline(createdAt, days);
  const originalIso = original.toISOString();
  const activeIso = active.toISOString();
  const { data, error } = await admin
    .from("transactions")
    .update({
      original_dispatch_deadline_at: tx.original_dispatch_deadline_at ?? originalIso,
      dispatch_deadline_at: tx.dispatch_deadline_at ?? activeIso,
      updated_at: now.toISOString(),
    })
    .eq("id", tx.id)
    .is("dispatch_deadline_at", null)
    .select(DISPATCH_CLOCK_SELECT)
    .maybeSingle();
  if (error) {
    console.error("ensureDispatchDeadline failed", error);
    return { ...tx, original_dispatch_deadline_at: originalIso, dispatch_deadline_at: activeIso };
  }
  if (data) {
    await recordTransactionEvent(admin, {
      transactionId: tx.id,
      eventType: TransactionEventType.DISPATCH_DEADLINE_CREATED,
      payload: {
        original_dispatch_deadline_at: originalIso,
        dispatch_deadline_at: activeIso,
        days,
      },
    });
    return data as DispatchClockRow;
  }
  return {
    ...tx,
    original_dispatch_deadline_at: tx.original_dispatch_deadline_at ?? originalIso,
    dispatch_deadline_at: tx.dispatch_deadline_at ?? activeIso,
  };
}

/**
 * Pause or resume the dispatch clock from the current fulfilment state.
 * Nested Teevo waits keep the original paused_at so days are not double-counted.
 */
export function nextDispatchClockState(
  tx: DispatchClockRow,
  now: Date = new Date()
): {
  dispatch_deadline_at: string | null;
  dispatch_clock_paused_at: string | null;
  dispatch_clock_pause_reason: string | null;
  changed: boolean;
  resumedDays?: number;
} {
  const shouldPause = pauseReasonFor(tx);
  const currentlyPausedAt = tx.dispatch_clock_paused_at ?? null;
  const currentReason = tx.dispatch_clock_pause_reason ?? null;
  const deadline = tx.dispatch_deadline_at ?? null;

  if (shouldPause) {
    if (currentlyPausedAt) {
      if (currentReason === shouldPause) {
        return {
          dispatch_deadline_at: deadline,
          dispatch_clock_paused_at: currentlyPausedAt,
          dispatch_clock_pause_reason: shouldPause,
          changed: false,
        };
      }
      return {
        dispatch_deadline_at: deadline,
        dispatch_clock_paused_at: currentlyPausedAt,
        dispatch_clock_pause_reason: shouldPause,
        changed: currentReason !== shouldPause,
      };
    }
    return {
      dispatch_deadline_at: deadline,
      dispatch_clock_paused_at: now.toISOString(),
      dispatch_clock_pause_reason: shouldPause,
      changed: true,
    };
  }

  if (!currentlyPausedAt) {
    return {
      dispatch_deadline_at: deadline,
      dispatch_clock_paused_at: null,
      dispatch_clock_pause_reason: null,
      changed: false,
    };
  }

  const pausedAt = new Date(currentlyPausedAt);
  const extraDays = calendarDaysBetween(pausedAt, now);
  const baseDeadline = deadline ? new Date(deadline) : now;
  const newDeadline = extraDays > 0 ? addCalendarDays(baseDeadline, extraDays) : baseDeadline;
  return {
    dispatch_deadline_at: newDeadline.toISOString(),
    dispatch_clock_paused_at: null,
    dispatch_clock_pause_reason: null,
    changed: true,
    resumedDays: extraDays,
  };
}

export async function syncDispatchClock(
  admin: SupabaseClient,
  tx: DispatchClockRow,
  now: Date = new Date()
): Promise<DispatchClockRow> {
  if (!isDispatchEnforcementOpen(tx) && tx.cancellation_status !== CancellationStatus.FAILED) {
    return tx;
  }
  const withDeadline = await ensureDispatchDeadline(admin, tx, now);
  const next = nextDispatchClockState(withDeadline, now);
  if (!next.changed) return withDeadline;

  const { data, error } = await admin
    .from("transactions")
    .update({
      dispatch_deadline_at: next.dispatch_deadline_at,
      dispatch_clock_paused_at: next.dispatch_clock_paused_at,
      dispatch_clock_pause_reason: next.dispatch_clock_pause_reason,
      updated_at: now.toISOString(),
    })
    .eq("id", withDeadline.id)
    .select(DISPATCH_CLOCK_SELECT)
    .maybeSingle();

  if (error) {
    console.error("syncDispatchClock failed", error);
    return {
      ...withDeadline,
      dispatch_deadline_at: next.dispatch_deadline_at,
      dispatch_clock_paused_at: next.dispatch_clock_paused_at,
      dispatch_clock_pause_reason: next.dispatch_clock_pause_reason,
    };
  }

  if (next.resumedDays != null) {
    await recordTransactionEvent(admin, {
      transactionId: withDeadline.id,
      eventType: TransactionEventType.DEADLINE_CHANGED,
      payload: {
        reason: "clock_resumed",
        previous_deadline_at: withDeadline.dispatch_deadline_at,
        dispatch_deadline_at: next.dispatch_deadline_at,
        paused_days_added: next.resumedDays,
        previous_pause_reason: withDeadline.dispatch_clock_pause_reason,
      },
    });
  } else if (next.dispatch_clock_paused_at && !withDeadline.dispatch_clock_paused_at) {
    await recordTransactionEvent(admin, {
      transactionId: withDeadline.id,
      eventType: TransactionEventType.DEADLINE_CHANGED,
      payload: {
        reason: "clock_paused",
        pause_reason: next.dispatch_clock_pause_reason,
        dispatch_deadline_at: next.dispatch_deadline_at,
      },
    });
  } else if (next.dispatch_clock_pause_reason !== withDeadline.dispatch_clock_pause_reason) {
    await recordTransactionEvent(admin, {
      transactionId: withDeadline.id,
      eventType: TransactionEventType.DEADLINE_CHANGED,
      payload: {
        reason: "pause_reason_changed",
        pause_reason: next.dispatch_clock_pause_reason,
        previous_pause_reason: withDeadline.dispatch_clock_pause_reason,
      },
    });
  }

  return (data as DispatchClockRow) ?? withDeadline;
}

export async function syncDispatchClockById(
  admin: SupabaseClient,
  transactionId: string,
  now: Date = new Date()
): Promise<DispatchClockRow | null> {
  const { data, error } = await admin
    .from("transactions")
    .select(DISPATCH_CLOCK_SELECT)
    .eq("id", transactionId)
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("syncDispatchClockById fetch failed", error);
    return null;
  }
  return syncDispatchClock(admin, data as DispatchClockRow, now);
}

export {
  canRequestDispatchExtension,
  dispatchDeadlineDisplay,
  PAUSE_REASON_COPY,
} from "@/lib/dispatch-display";
