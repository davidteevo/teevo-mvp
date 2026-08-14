import {
  formatDispatchDeadline,
  getDispatchUrgency,
  type DispatchUrgency,
} from "@/lib/business-days";

export const PAUSE_REASON_COPY: Record<string, string> = {
  starter_pack: "This date will be extended while we send your Teevo box.",
  packaging_review: "This date will be extended while we review your packaging.",
  manual_label: "This date will be extended while we prepare your shipping label.",
};

export function dispatchDeadlineDisplay(
  tx: {
    dispatch_deadline_at?: string | null;
    dispatch_clock_paused_at?: string | null;
    dispatch_clock_pause_reason?: string | null;
  },
  now: Date = new Date()
): {
  label: string;
  dateLabel: string;
  urgency: DispatchUrgency;
  paused: boolean;
  pauseCopy: string | null;
} | null {
  if (!tx.dispatch_deadline_at) return null;
  const dateLabel = formatDispatchDeadline(tx.dispatch_deadline_at, now);
  const paused = !!tx.dispatch_clock_paused_at;
  const reason = tx.dispatch_clock_pause_reason;
  const pauseCopy = paused ? (reason && PAUSE_REASON_COPY[reason]) || PAUSE_REASON_COPY.packaging_review : null;
  let urgency = getDispatchUrgency(tx.dispatch_deadline_at, now);
  if (paused && (urgency === "overdue" || urgency === "today")) urgency = "normal";

  let label = `Ship by ${dateLabel}`;
  if (urgency === "approaching") label = "Dispatch due soon";
  if (urgency === "today") label = "Dispatch required today";
  if (urgency === "overdue") label = "Dispatch deadline passed";

  return { label, dateLabel, urgency, paused, pauseCopy };
}

export function canRequestDispatchExtension(tx: {
  status?: string | null;
  shipped_at?: string | null;
  cancellation_status?: string | null;
  dispatch_deadline_at?: string | null;
  dispatch_extension_status?: string | null;
}): boolean {
  if ((tx.status ?? "").toLowerCase() !== "pending") return false;
  if (tx.shipped_at) return false;
  if (tx.cancellation_status === "in_progress" || tx.cancellation_status === "completed") return false;
  if (!tx.dispatch_deadline_at) return false;
  if (new Date(tx.dispatch_deadline_at).getTime() <= Date.now()) return false;
  if (tx.dispatch_extension_status) return false;
  return true;
}
