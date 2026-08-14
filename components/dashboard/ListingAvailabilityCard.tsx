"use client";

import Link from "next/link";
import { useState } from "react";

export function ListingAvailabilityCard({
  transactionId,
  listingId,
  itemName,
  onResolved,
}: {
  transactionId: string;
  listingId: string;
  itemName: string;
  onResolved: (available: boolean) => void;
}) {
  const [submitting, setSubmitting] = useState<"yes" | "no" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function confirm(available: boolean) {
    setSubmitting(available ? "yes" : "no");
    setError(null);
    try {
      const res = await fetch(`/api/transactions/${transactionId}/confirm-availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not save");
        return;
      }
      onResolved(available);
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="w-full rounded-lg border border-golden-tee/40 bg-golden-tee/10 p-3 space-y-2">
      <p className="text-sm font-semibold text-mowing-green">Is your {itemName} still available?</p>
      <p className="text-sm text-mowing-green/80">
        Your previous sale was cancelled because the item wasn&apos;t dispatched. Let us know whether
        you&apos;d still like to sell it on Teevo.
      </p>
      {error && <p className="text-sm text-divot-pink">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => confirm(true)}
          disabled={!!submitting}
          className="rounded-lg bg-mowing-green text-off-white-pique px-3 py-1.5 text-sm font-medium hover:opacity-90 disabled:opacity-60"
        >
          {submitting === "yes" ? "Saving…" : "Yes, it's still available"}
        </button>
        <button
          type="button"
          onClick={() => confirm(false)}
          disabled={!!submitting}
          className="rounded-lg border border-mowing-green/20 px-3 py-1.5 text-sm font-medium text-mowing-green hover:bg-mowing-green/5 disabled:opacity-60"
        >
          {submitting === "no" ? "Saving…" : "No, it's no longer available"}
        </button>
        <Link
          href={`/sell/edit/${listingId}`}
          className="rounded-lg border border-par-3-punch/40 text-par-3-punch px-3 py-1.5 text-sm font-medium hover:bg-par-3-punch/10"
        >
          Edit listing
        </Link>
      </div>
    </div>
  );
}
