"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminDispatchActions({
  transactionId,
  canCancel,
  canRetry,
  listingAvailability,
}: {
  transactionId: string;
  canCancel: boolean;
  canRetry: boolean;
  listingAvailability: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState("3");

  async function run(action: string, extra?: Record<string, unknown>) {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/transactions/${transactionId}/dispatch-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-par-3-punch/20 bg-white p-4 space-y-3">
      <h2 className="text-lg font-semibold text-mowing-green">Admin actions</h2>
      {error && <p className="text-sm text-divot-pink">{error}</p>}
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm text-mowing-green">
          Extra business days
          <input
            type="number"
            min={1}
            max={30}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="ml-2 w-20 rounded-lg border border-mowing-green/20 px-2 py-1"
          />
        </label>
        <button
          type="button"
          disabled={!!busy || !canCancel}
          onClick={() => run("extend", { businessDays: Number(days) })}
          className="rounded-lg border border-mowing-green/20 px-3 py-1.5 text-sm font-medium text-mowing-green hover:bg-mowing-green/5 disabled:opacity-50"
        >
          {busy === "extend" ? "Saving…" : "Extend deadline"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {canRetry && (
          <button
            type="button"
            disabled={!!busy}
            onClick={() => run("retry_refund")}
            className="rounded-lg bg-mowing-green text-off-white-pique px-3 py-1.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {busy === "retry_refund" ? "Retrying…" : "Retry refund"}
          </button>
        )}
        {canCancel && (
          <button
            type="button"
            disabled={!!busy}
            onClick={() => {
              if (confirm("Cancel this order and refund the buyer?")) run("cancel");
            }}
            className="rounded-lg border border-divot-pink/40 text-mowing-green px-3 py-1.5 text-sm font-medium hover:bg-divot-pink/10 disabled:opacity-50"
          >
            {busy === "cancel" ? "Cancelling…" : "Cancel and refund"}
          </button>
        )}
        {listingAvailability === "required" && (
          <>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => run("override_availability", { available: true })}
              className="rounded-lg border border-par-3-punch/40 text-par-3-punch px-3 py-1.5 text-sm font-medium hover:bg-par-3-punch/10 disabled:opacity-50"
            >
              Relist item
            </button>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => run("override_availability", { available: false })}
              className="rounded-lg border border-mowing-green/20 px-3 py-1.5 text-sm font-medium text-mowing-green hover:bg-mowing-green/5 disabled:opacity-50"
            >
              Mark unavailable
            </button>
          </>
        )}
      </div>
    </div>
  );
}
