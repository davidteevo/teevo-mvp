"use client";

const DEFAULT_EXTRA_DAYS = 3;

export function RequestMoreTimeModal({
  extraBusinessDays = DEFAULT_EXTRA_DAYS,
  onClose,
  onConfirm,
  submitting,
}: {
  extraBusinessDays?: number;
  onClose: () => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-mowing-green/40 p-4">
      <div
        role="dialog"
        aria-labelledby="more-time-title"
        className="w-full max-w-md rounded-xl border border-par-3-punch/20 bg-white p-5 shadow-lg"
      >
        <h2 id="more-time-title" className="text-lg font-semibold text-mowing-green">
          Need a little longer?
        </h2>
        <p className="mt-2 text-sm text-mowing-green/80">
          You can ask the buyer for an additional{" "}
          <span className="font-medium">{extraBusinessDays} business days</span> to dispatch your
          order.
        </p>
        <p className="mt-2 text-sm text-mowing-green/80">The buyer must approve the extension.</p>
        <div className="mt-4 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-mowing-green/20 px-4 py-2 text-sm font-medium text-mowing-green hover:bg-mowing-green/5 disabled:opacity-60"
          >
            Keep current deadline
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="rounded-lg bg-mowing-green text-off-white-pique px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Requesting…" : `Request ${extraBusinessDays} more business days`}
          </button>
        </div>
      </div>
    </div>
  );
}
