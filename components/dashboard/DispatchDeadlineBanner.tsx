"use client";

import { dispatchDeadlineDisplay } from "@/lib/dispatch-display";

type Props = {
  dispatchDeadlineAt?: string | null;
  pausedAt?: string | null;
  pauseReason?: string | null;
  itemName?: string;
};

export function DispatchDeadlineBanner({
  dispatchDeadlineAt,
  pausedAt,
  pauseReason,
}: Props) {
  const display = dispatchDeadlineDisplay({
    dispatch_deadline_at: dispatchDeadlineAt,
    dispatch_clock_paused_at: pausedAt,
    dispatch_clock_pause_reason: pauseReason,
  });
  if (!display) return null;

  const tone =
    display.urgency === "today" || display.urgency === "overdue"
      ? "border-divot-pink/40 bg-divot-pink/15"
      : display.urgency === "approaching"
        ? "border-golden-tee/40 bg-golden-tee/15"
        : "border-mowing-green/20 bg-mowing-green/5";

  return (
    <div className={`w-full rounded-lg border px-3 py-2 ${tone}`}>
      <p className="text-sm font-semibold text-mowing-green">{display.label}</p>
      {display.urgency === "approaching" && (
        <p className="mt-0.5 text-sm text-mowing-green/80">Ship by {display.dateLabel}.</p>
      )}
      {display.urgency === "today" && (
        <p className="mt-0.5 text-sm text-mowing-green/80">
          Ship this order today to avoid cancellation.
        </p>
      )}
      {display.paused && display.pauseCopy && (
        <p className="mt-1 text-xs text-mowing-green/70">{display.pauseCopy}</p>
      )}
    </div>
  );
}
