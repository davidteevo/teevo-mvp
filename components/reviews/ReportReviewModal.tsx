"use client";

import { useState } from "react";
import {
  REVIEW_REPORT_REASONS,
  REVIEW_REPORT_REASON_LABELS,
  type ReviewReportReasonValue,
} from "@/lib/seller-reviews";
import { track } from "@/lib/analytics";
import { FEEDBACK_EVENTS } from "@/lib/seller-reviews";

export function ReportReviewModal({
  reviewId,
  onClose,
  onReported,
}: {
  reviewId: string;
  onClose: () => void;
  onReported?: () => void;
}) {
  const [reason, setReason] = useState<ReviewReportReasonValue | "">("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!reason) {
      setError("Please choose a reason");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/seller-reviews/${reviewId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details: details.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not submit report");
        return;
      }
      track(FEEDBACK_EVENTS.REPORTED, { review_id: reviewId, reason });
      setDone(true);
      onReported?.();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-review-title"
    >
      <div
        className="rounded-2xl bg-white shadow-xl max-w-md w-full p-6 text-mowing-green"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <>
            <h2 id="report-review-title" className="text-xl font-bold mb-2">
              Report sent
            </h2>
            <p className="text-sm text-mowing-green/80 mb-5">
              Thanks. Teevo will review this feedback. It has not been removed automatically.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-mowing-green text-off-white-pique px-4 py-3 font-semibold hover:opacity-90"
            >
              Done
            </button>
          </>
        ) : (
          <>
            <h2 id="report-review-title" className="text-xl font-bold mb-2">
              Report review
            </h2>
            <p className="text-sm text-mowing-green/80 mb-4">
              Tell us why this feedback needs Teevo&apos;s attention.
            </p>
            <label className="block text-sm font-medium mb-1" htmlFor="report-reason">
              Reason
            </label>
            <select
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as ReviewReportReasonValue | "")}
              className="w-full rounded-lg border border-par-3-punch/30 bg-white px-3 py-2 text-sm mb-3"
            >
              <option value="">Select a reason</option>
              {REVIEW_REPORT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {REVIEW_REPORT_REASON_LABELS[r]}
                </option>
              ))}
            </select>
            {reason === "other" && (
              <>
                <label className="block text-sm font-medium mb-1" htmlFor="report-details">
                  Explanation
                </label>
                <textarea
                  id="report-details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-par-3-punch/30 px-3 py-2 text-sm mb-3"
                  placeholder="Briefly describe the issue"
                />
              </>
            )}
            {error && <p className="text-sm text-divot-pink mb-3">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-mowing-green/40 text-mowing-green px-4 py-3 font-semibold hover:bg-mowing-green/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="flex-1 rounded-xl bg-mowing-green text-off-white-pique px-4 py-3 font-semibold hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? "Sending…" : "Submit report"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
