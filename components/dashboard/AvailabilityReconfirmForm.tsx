"use client";

import { useEffect, useState } from "react";

export type ConfirmListingItem = {
  id: string;
  title: string;
  available?: boolean | null;
};

export function AvailabilityReconfirmForm({
  token,
  initialListings,
  preload,
}: {
  token?: string | null;
  initialListings?: ConfirmListingItem[];
  preload?: { listingId?: string | null; available?: boolean | null };
}) {
  const [listings, setListings] = useState<ConfirmListingItem[]>(initialListings ?? []);
  const [choices, setChoices] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(!initialListings);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (initialListings) return;
    const params = new URLSearchParams();
    if (token) params.set("token", token);
    fetch(`/api/listings/confirm-availability${params.toString() ? `?${params}` : ""}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Could not load listings");
        setListings(Array.isArray(data.listings) ? data.listings : []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load listings"))
      .finally(() => setLoading(false));
  }, [initialListings, token]);

  useEffect(() => {
    if (!preload?.listingId || typeof preload.available !== "boolean") return;
    setChoices((prev) => ({ ...prev, [preload.listingId as string]: preload.available as boolean }));
  }, [preload?.listingId, preload?.available]);

  async function submit(responses: { listingId: string; available: boolean }[]) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/listings/confirm-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token || undefined, responses }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not save");
        return;
      }
      const remaining: ConfirmListingItem[] = Array.isArray(data.listings) ? data.listings : [];
      setListings(remaining);
      setChoices({});
      setDone(remaining.length === 0);
    } finally {
      setSubmitting(false);
    }
  }

  const remainingChoices = listings
    .map((l) => (typeof choices[l.id] === "boolean" ? { listingId: l.id, available: choices[l.id] } : null))
    .filter((row): row is { listingId: string; available: boolean } => row !== null);

  if (loading) {
    return <p className="text-mowing-green/80">Loading your listings…</p>;
  }

  if (done || listings.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-lg font-semibold text-mowing-green">Thanks — you’re all set.</p>
        <p className="text-sm text-mowing-green/80">
          {done
            ? "We’ve saved your answers. Listings you still have will be available to buyers again when nothing else is blocking them."
            : "There are no listings waiting for confirmation."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-divot-pink">{error}</p>}
      <ul className="space-y-3">
        {listings.map((listing) => (
          <li
            key={listing.id}
            className="rounded-lg border border-par-3-punch/20 bg-white p-4 space-y-3"
          >
            <p className="font-medium text-mowing-green">{listing.title}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setChoices((prev) => ({ ...prev, [listing.id]: true }))}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  choices[listing.id] === true
                    ? "bg-mowing-green text-off-white-pique"
                    : "border border-mowing-green/20 text-mowing-green hover:bg-mowing-green/5"
                }`}
              >
                Still available
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setChoices((prev) => ({ ...prev, [listing.id]: false }))}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  choices[listing.id] === false
                    ? "bg-divot-pink text-white"
                    : "border border-mowing-green/20 text-mowing-green hover:bg-mowing-green/5"
                }`}
              >
                No longer available
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={submitting || remainingChoices.length === 0}
          onClick={() => submit(remainingChoices)}
          className="rounded-lg bg-mowing-green text-off-white-pique px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save answers"}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() =>
            submit(listings.map((l) => ({ listingId: l.id, available: true })))
          }
          className="rounded-lg border border-mowing-green/20 px-4 py-2 text-sm font-medium text-mowing-green hover:bg-mowing-green/5 disabled:opacity-60"
        >
          Confirm all are still available
        </button>
      </div>
    </div>
  );
}
