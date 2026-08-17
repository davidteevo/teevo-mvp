"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { getListingDisplayTitle } from "@/lib/listing-display";
import type { AllListing } from "@/lib/admin-data";
import type { Listing } from "@/types/database";

function availabilityLabel(l: AllListing): string {
  if (l.availability_confirmation_status === "required") return "Awaiting confirmation";
  if (l.availability_confirmation_status === "confirmed_available") return "Confirmed";
  if (l.availability_confirmation_status === "confirmed_unavailable") return "Unavailable";
  if (l.availability_confirmation_status === "expired") return "Expired";
  return "Never requested";
}

function formatDay(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

const SKIP_LABELS: Record<string, string> = {
  active_order: "active order",
  archived: "archived",
  not_verified: "not verified",
  dispatch_timeout: "dispatch confirmation in progress",
  already_required: "already awaiting confirmation",
  not_found: "not found",
};

export default function AllListingsClient({ listings }: { listings: AllListing[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [createdBefore, setCreatedBefore] = useState(searchParams.get("createdBefore") ?? "");
  const [buying, setBuying] = useState(searchParams.get("buying") ?? "");
  const [availability, setAvailability] = useState(searchParams.get("availability") ?? "");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmReconfirm, setConfirmReconfirm] = useState(false);

  const selectedListings = useMemo(
    () => listings.filter((l) => selected.has(l.id)),
    [listings, selected]
  );
  const selectedSellerCount = useMemo(
    () => new Set(selectedListings.map((l) => l.user_id)).size,
    [selectedListings]
  );

  const search = () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (status) params.set("status", status);
    if (createdBefore) params.set("createdBefore", createdBefore);
    if (buying) params.set("buying", buying);
    if (availability) params.set("availability", availability);
    router.push(`/admin/listings/all${params.toString() ? `?${params}` : ""}`);
  };

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(listings.map((l) => l.id)) : new Set());
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleDelete = async (id: string, displayTitle: string) => {
    if (!confirm(`Permanently delete listing "${displayTitle}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/listings/${id}/delete`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) router.refresh();
      else alert(data.error ?? "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const runBulk = async (action: "pause" | "resume" | "reconfirm") => {
    const listingIds = Array.from(selected);
    if (listingIds.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      if (action === "reconfirm") {
        const res = await fetch("/api/admin/listings/availability/reconfirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingIds }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Could not request confirmation");
          return;
        }
        const skipped = Array.isArray(data.skipped) ? data.skipped : [];
        if (skipped.length) {
          const summary = skipped
            .slice(0, 5)
            .map((s: { reason?: string }) => SKIP_LABELS[s.reason ?? ""] ?? s.reason)
            .join(", ");
          setError(`Requested ${data.requested?.length ?? 0}. Skipped ${skipped.length}: ${summary}`);
        }
        setSelected(new Set());
        setConfirmReconfirm(false);
        router.refresh();
        return;
      }
      const res = await fetch("/api/admin/listings/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingIds, paused: action === "pause" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not update listings");
        return;
      }
      setSelected(new Set());
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm font-medium text-mowing-green/80 mb-1">Search</label>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Model, brand, description…"
            className="rounded-lg border border-par-3-punch/20 bg-white px-3 py-2 text-mowing-green w-64 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-mowing-green/80 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-par-3-punch/20 bg-white px-3 py-2 text-mowing-green text-sm"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
            <option value="sold">Sold</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-mowing-green/80 mb-1">Created before</label>
          <input
            type="date"
            value={createdBefore}
            onChange={(e) => setCreatedBefore(e.target.value)}
            className="rounded-lg border border-par-3-punch/20 bg-white px-3 py-2 text-mowing-green text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-mowing-green/80 mb-1">Buying status</label>
          <select
            value={buying}
            onChange={(e) => setBuying(e.target.value)}
            className="rounded-lg border border-par-3-punch/20 bg-white px-3 py-2 text-mowing-green text-sm"
          >
            <option value="">All</option>
            <option value="purchasable">Purchasable</option>
            <option value="paused">Buying paused</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-mowing-green/80 mb-1">Availability</label>
          <select
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            className="rounded-lg border border-par-3-punch/20 bg-white px-3 py-2 text-mowing-green text-sm"
          >
            <option value="">All</option>
            <option value="never">Never requested</option>
            <option value="required">Awaiting confirmation</option>
            <option value="confirmed_available">Confirmed</option>
            <option value="expired">Confirmation expired</option>
            <option value="confirmed_unavailable">Seller says unavailable</option>
          </select>
        </div>
        <button
          type="button"
          onClick={search}
          className="rounded-lg bg-mowing-green text-off-white-pique px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          Search
        </button>
        <Link href="/admin/listings" className="text-sm text-mowing-green/80 hover:text-mowing-green">
          Pending only →
        </Link>
      </div>

      {selected.size > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-par-3-punch/20 bg-white p-3">
          <p className="text-sm text-mowing-green mr-2">
            {selected.size} selected · {selectedSellerCount} seller{selectedSellerCount === 1 ? "" : "s"}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => runBulk("pause")}
            className="rounded-lg border border-mowing-green/20 px-3 py-1.5 text-sm font-medium text-mowing-green hover:bg-mowing-green/5 disabled:opacity-60"
          >
            Pause buying
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => runBulk("resume")}
            className="rounded-lg border border-mowing-green/20 px-3 py-1.5 text-sm font-medium text-mowing-green hover:bg-mowing-green/5 disabled:opacity-60"
          >
            Resume buying
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmReconfirm(true)}
            className="rounded-lg bg-mowing-green text-off-white-pique px-3 py-1.5 text-sm font-medium hover:opacity-90 disabled:opacity-60"
          >
            Reconfirm availability
          </button>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-divot-pink">{error}</p>}

      {confirmReconfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-mowing-green/40 p-4">
          <div className="max-w-md w-full rounded-xl bg-white p-6 shadow-lg space-y-4">
            <h2 className="text-lg font-semibold text-mowing-green">
              Reconfirm availability for {selected.size} listing{selected.size === 1 ? "" : "s"}?
            </h2>
            <p className="text-sm text-mowing-green/80">
              Purchasing will be temporarily disabled while sellers confirm their items are still
              available. {selectedSellerCount} seller{selectedSellerCount === 1 ? "" : "s"} will
              automatically receive an email and Teevo notification.
            </p>
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmReconfirm(false)}
                className="rounded-lg border border-mowing-green/20 px-3 py-1.5 text-sm font-medium text-mowing-green"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => runBulk("reconfirm")}
                className="rounded-lg bg-mowing-green text-off-white-pique px-3 py-1.5 text-sm font-medium"
              >
                {busy ? "Requesting…" : "Request confirmation"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-par-3-punch/20 bg-white overflow-hidden">
        {listings.length === 0 ? (
          <div className="p-8 text-center text-mowing-green/80">
            No listings match. Try changing search or status.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-par-3-punch/20 bg-mowing-green/5 text-left text-mowing-green/80 font-medium">
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={listings.length > 0 && selected.size === listings.length}
                      onChange={(e) => toggleAll(e.target.checked)}
                      aria-label="Select all listings"
                    />
                  </th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Category · Brand</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Buying</th>
                  <th className="p-3">Availability</th>
                  <th className="p-3">Watchers</th>
                  <th className="p-3">Seller</th>
                  <th className="p-3">Listed</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => (
                  <tr key={l.id} className="border-b border-par-3-punch/10 hover:bg-mowing-green/[0.03]">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selected.has(l.id)}
                        onChange={(e) => toggleOne(l.id, e.target.checked)}
                        aria-label={`Select ${getListingDisplayTitle(l as unknown as Listing)}`}
                      />
                    </td>
                    <td className="p-3">
                      <Link href={`/admin/listings/${l.id}`} className="font-medium text-mowing-green hover:underline">
                        {getListingDisplayTitle(l as unknown as Listing)}
                      </Link>
                      {l.created_on_behalf && (
                        <span className="block text-xs text-mowing-green/60 mt-0.5">
                          Created by admin on behalf of {l.seller_email ?? "seller"}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-mowing-green/80">{l.category} · {l.brand}</td>
                    <td className="p-3">{formatPrice(l.price)}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        l.status === "pending" ? "bg-golden-tee/30" :
                        l.status === "verified" ? "bg-par-3-punch/30" :
                        l.status === "rejected" ? "bg-divot-pink/30" :
                        "bg-mowing-green/20"
                      } text-mowing-green`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="p-3 text-mowing-green/80">
                      {l.buying_paused ? "Paused" : "Enabled"}
                    </td>
                    <td className="p-3 text-mowing-green/80">
                      <span className="block">{availabilityLabel(l)}</span>
                      <span className="block text-xs text-mowing-green/60">
                        {l.availability_confirmation_status === "required"
                          ? `Requested ${formatDay(l.availability_confirmation_requested_at)}`
                          : l.availability_confirmed_at
                            ? `Last confirmed ${formatDay(l.availability_confirmed_at)}`
                            : null}
                      </span>
                    </td>
                    <td className="p-3 text-mowing-green/80">{l.watch_count}</td>
                    <td className="p-3 text-mowing-green/80">
                      {l.seller_email ? (
                        <a href={`mailto:${l.seller_email}`} className="hover:underline">{l.seller_email}</a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3 text-mowing-green/70">
                      {new Date(l.created_at).toLocaleDateString("en-GB")}
                    </td>
                    <td className="p-3 text-right">
                      <Link href={`/admin/listings/${l.id}`} className="text-par-3-punch hover:underline mr-2">
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(l.id, getListingDisplayTitle(l as unknown as Listing))}
                        disabled={deletingId === l.id}
                        className="text-divot-pink hover:underline disabled:opacity-50"
                      >
                        {deletingId === l.id ? "Deleting…" : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
