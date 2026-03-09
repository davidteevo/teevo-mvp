"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { formatPrice } from "@/lib/format";

type Listing = {
  id: string;
  category: string;
  brand: string;
  model: string;
  condition: string;
  price: number;
  status: string;
  created_at: string;
  admin_feedback?: string | null;
  archived_at?: string | null;
};

export default function DashboardListingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [deletedListings, setDeletedListings] = useState<Listing[]>([]);
  const [unpublishingId, setUnpublishingId] = useState<string | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);

  const fetchActive = useCallback(() => {
    fetch("/api/listings/mine")
      .then((r) => r.json())
      .then((data) => setListings(data.listings ?? []))
      .catch(() => setListings([]));
  }, []);
  const fetchDeleted = useCallback(() => {
    fetch("/api/listings/mine?archived=1")
      .then((r) => r.json())
      .then((data) => setDeletedListings(data.listings ?? []))
      .catch(() => setDeletedListings([]));
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?redirect=${encodeURIComponent("/dashboard/listings")}`);
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const refresh = () => {
      fetchActive();
      fetchDeleted();
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [user, fetchActive, fetchDeleted]);

  if (loading || !user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-mowing-green/80">
        Loading…
      </div>
    );
  }

  const formatListedAt = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-golden-tee/30 text-mowing-green",
      verified: "bg-par-3-punch/30 text-mowing-green",
      rejected: "bg-divot-pink/30 text-mowing-green",
      sold: "bg-mowing-green/20 text-mowing-green",
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? ""}`}>
        {status}
      </span>
    );
  };

  const handleUnpublish = async (l: Listing) => {
    if (!confirm("Move this listing to Deleted? It will be hidden from the marketplace.")) return;
    setUnpublishingId(l.id);
    try {
      const res = await fetch(`/api/listings/${l.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: true }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchActive();
        fetchDeleted();
      } else {
        alert(data.error ?? "Failed to unpublish");
      }
    } finally {
      setUnpublishingId(null);
    }
  };

  const handleReactivate = async (l: Listing) => {
    setReactivatingId(l.id);
    try {
      const res = await fetch(`/api/listings/${l.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: false }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchActive();
        fetchDeleted();
      } else {
        alert(data.error ?? "Failed to reactivate");
      }
    } finally {
      setReactivatingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-mowing-green">My listings</h1>
        <Link
          href="/sell"
          className="rounded-xl bg-mowing-green text-off-white-pique px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          New listing
        </Link>
      </div>
      <div className="mt-6 rounded-xl border border-par-3-punch/20 bg-white overflow-hidden">
        {listings.length === 0 ? (
          <div className="p-8 text-center text-mowing-green/80">
            <p>You haven’t listed anything yet.</p>
            <Link href="/sell" className="mt-2 inline-block text-par-3-punch hover:underline">
              List your first item
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-par-3-punch/10">
            {listings.map((l) => (
              <li key={l.id} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <Link
                    href={`/listing/${l.id}`}
                    className="min-w-0 flex-1 rounded-lg hover:bg-mowing-green/5 -m-2 p-2 transition-colors"
                  >
                    <p className="font-medium text-mowing-green">{l.model}</p>
                    <p className="text-sm text-mowing-green/70">{l.category} · {l.brand}</p>
                    {l.created_at && (
                      <p className="text-xs text-mowing-green/50 mt-0.5">
                        Listed {formatListedAt(l.created_at)}
                      </p>
                    )}
                  </Link>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-semibold text-mowing-green">{formatPrice(l.price)}</span>
                    {statusBadge(l.status)}
                    <div className="flex items-center gap-2">
                      <Link href={`/listing/${l.id}`} className="text-sm text-par-3-punch hover:underline">
                        View
                      </Link>
                      {l.status === "pending" && (
                        <Link href={`/sell/edit/${l.id}`} className="text-sm text-par-3-punch hover:underline">
                          Edit
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => handleUnpublish(l)}
                        disabled={unpublishingId === l.id}
                        className="text-sm text-mowing-green/70 hover:text-mowing-green hover:underline disabled:opacity-50"
                      >
                        {unpublishingId === l.id ? "Moving…" : "Unpublish"}
                      </button>
                    </div>
                  </div>
                </div>
                {l.admin_feedback && (l.status === "pending" || l.status === "rejected") && (
                  <div className="mt-2 rounded-lg bg-golden-tee/20 border border-golden-tee/30 px-3 py-2 text-sm text-mowing-green/90">
                    <p className="font-medium text-mowing-green/80 mb-0.5">Feedback from reviewer</p>
                    <p className="whitespace-pre-wrap">{l.admin_feedback}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {deletedListings.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-mowing-green">Deleted</h2>
          <p className="text-sm text-mowing-green/70 mt-0.5">Unpublished listings. Reactivate to show them again.</p>
          <div className="mt-3 rounded-xl border border-par-3-punch/20 bg-white overflow-hidden">
            <ul className="divide-y divide-par-3-punch/10">
              {deletedListings.map((l) => (
                <li key={l.id} className="p-4 flex items-center justify-between gap-3">
                  <Link
                    href={`/listing/${l.id}`}
                    className="min-w-0 flex-1 rounded-lg hover:bg-mowing-green/5 -m-2 p-2 transition-colors"
                  >
                    <p className="font-medium text-mowing-green">{l.model}</p>
                    <p className="text-sm text-mowing-green/70">{l.category} · {l.brand}</p>
                    {l.archived_at && (
                      <p className="text-xs text-mowing-green/50 mt-0.5">
                        Unpublished {formatListedAt(l.archived_at)}
                      </p>
                    )}
                  </Link>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-semibold text-mowing-green">{formatPrice(l.price)}</span>
                    {statusBadge(l.status)}
                    <button
                      type="button"
                      onClick={() => handleReactivate(l)}
                      disabled={reactivatingId === l.id}
                      className="rounded-lg bg-par-3-punch text-white px-3 py-1.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
                    >
                      {reactivatingId === l.id ? "Reactivating…" : "Reactivate"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
