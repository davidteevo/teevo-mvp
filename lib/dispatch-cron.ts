import type { SupabaseClient } from "@supabase/supabase-js";
import {
  businessDaysBetween,
  isSameLondonDate,
  previousBusinessDay,
} from "@/lib/business-days";
import {
  DISPATCH_CLOCK_SELECT,
  isDispatchClockPaused,
  isDispatchEnforcementOpen,
  syncDispatchClock,
  type DispatchClockRow,
} from "@/lib/dispatch-deadline";
import { notifyDispatchReminder } from "@/lib/dispatch-notifications";
import { CancellationReason, cancelUndispatchedOrder } from "@/lib/dispatch-timeout";
import { recordTransactionEvent, TransactionEventType } from "@/lib/transaction-events";
import { trackServerEvent } from "@/lib/starter-pack";

const DISPATCH_CRON_SELECT = `${DISPATCH_CLOCK_SELECT}, buyer_id, seller_id, listing_id, dispatch_reminder_after_purchase_sent_at, dispatch_reminder_one_day_sent_at, dispatch_reminder_final_sent_at`;

type DispatchCronRow = DispatchClockRow & {
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  dispatch_reminder_after_purchase_sent_at?: string | null;
  dispatch_reminder_one_day_sent_at?: string | null;
  dispatch_reminder_final_sent_at?: string | null;
};

export async function processDispatchDeadlines(admin: SupabaseClient): Promise<{
  synced: number;
  remindersAfterPurchase: number;
  remindersOneDay: number;
  remindersFinal: number;
  cancelled: number;
  cancelFailed: number;
}> {
  const counts = {
    synced: 0,
    remindersAfterPurchase: 0,
    remindersOneDay: 0,
    remindersFinal: 0,
    cancelled: 0,
    cancelFailed: 0,
  };
  const now = new Date();

  const { data: rows, error } = await admin
    .from("transactions")
    .select(DISPATCH_CRON_SELECT)
    .eq("status", "pending")
    .is("shipped_at", null)
    .limit(200);

  if (error) {
    console.error("processDispatchDeadlines query failed", error);
    return counts;
  }

  for (const raw of rows ?? []) {
    const tx = await syncDispatchClock(admin, raw as DispatchClockRow, now);
    counts.synced += 1;
    const current: DispatchCronRow = { ...(raw as DispatchCronRow), ...tx };
    if (!isDispatchEnforcementOpen(current)) continue;
    if (isDispatchClockPaused(current)) continue;
    if (!current.dispatch_deadline_at || !current.created_at) continue;

    const deadline = new Date(current.dispatch_deadline_at);
    const createdAt = new Date(current.created_at);

    if (!current.dispatch_reminder_after_purchase_sent_at && businessDaysBetween(createdAt, now) >= 2) {
      await notifyDispatchReminder(admin, {
        transactionId: current.id,
        listingId: current.listing_id,
        sellerId: current.seller_id,
        deadlineIso: current.dispatch_deadline_at,
        stage: "after_purchase",
      });
      await admin
        .from("transactions")
        .update({
          dispatch_reminder_after_purchase_sent_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", current.id)
        .is("dispatch_reminder_after_purchase_sent_at", null);
      await recordTransactionEvent(admin, {
        transactionId: current.id,
        eventType: TransactionEventType.REMINDER_SENT,
        payload: { stage: "after_purchase" },
      });
      await trackServerEvent(admin, "dispatch_reminder_sent", {
        userId: current.seller_id,
        properties: { transaction_id: current.id, stage: "after_purchase" },
      });
      counts.remindersAfterPurchase += 1;
    }

    const oneDayBefore = previousBusinessDay(deadline);
    if (!current.dispatch_reminder_one_day_sent_at && isSameLondonDate(now, oneDayBefore) && now.getTime() <= deadline.getTime()) {
      await notifyDispatchReminder(admin, {
        transactionId: current.id,
        listingId: current.listing_id,
        sellerId: current.seller_id,
        deadlineIso: current.dispatch_deadline_at,
        stage: "one_day",
      });
      await admin
        .from("transactions")
        .update({
          dispatch_reminder_one_day_sent_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", current.id)
        .is("dispatch_reminder_one_day_sent_at", null);
      await recordTransactionEvent(admin, {
        transactionId: current.id,
        eventType: TransactionEventType.REMINDER_SENT,
        payload: { stage: "one_day" },
      });
      await trackServerEvent(admin, "dispatch_reminder_sent", {
        userId: current.seller_id,
        properties: { transaction_id: current.id, stage: "one_day" },
      });
      counts.remindersOneDay += 1;
    }

    if (!current.dispatch_reminder_final_sent_at && isSameLondonDate(now, deadline) && now.getTime() <= deadline.getTime()) {
      await notifyDispatchReminder(admin, {
        transactionId: current.id,
        listingId: current.listing_id,
        sellerId: current.seller_id,
        deadlineIso: current.dispatch_deadline_at,
        stage: "final",
      });
      await admin
        .from("transactions")
        .update({
          dispatch_reminder_final_sent_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", current.id)
        .is("dispatch_reminder_final_sent_at", null);
      await recordTransactionEvent(admin, {
        transactionId: current.id,
        eventType: TransactionEventType.REMINDER_SENT,
        payload: { stage: "final" },
      });
      await trackServerEvent(admin, "dispatch_reminder_sent", {
        userId: current.seller_id,
        properties: { transaction_id: current.id, stage: "final" },
      });
      counts.remindersFinal += 1;
    }

    if (now.getTime() > deadline.getTime()) {
      const result = await cancelUndispatchedOrder(admin, {
        transactionId: current.id,
        reason: CancellationReason.SELLER_DISPATCH_TIMEOUT,
      });
      if (result.ok) {
        if (!result.alreadyCompleted) counts.cancelled += 1;
      } else if (!result.retryable || result.error !== "Deadline has not passed") {
        counts.cancelFailed += 1;
      }
    }
  }

  return counts;
}
