"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { PACKAGING_PHOTO_LABELS } from "@/lib/fulfilment";

type PendingTx = {
  id: string;
  listing_id: string;
  created_at: string;
  listing?: { model?: string; category?: string; brand?: string } | null;
  photoUrls: string[];
  photoCount?: number;
};

export default function AdminPackagingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [list, setList] = useState<PendingTx[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?redirect=${encodeURIComponent("/dashboard/admin/packaging")}`);
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    setForbidden(false);
    fetch("/api/admin/packaging-pending")
      .then((r) => {
        if (r.status === 403) {
          setForbidden(true);
          return { transactions: [] };
        }
        return r.json();
      })
      .then((data) => setList(data.transactions ?? []))
      .catch(() => setList([]))
      .finally(() => setLoadingList(false));
  }, [user]);

  const verify = async (id: string) => {
    setActioningId(id);
    try {
      const res = await fetch(`/api/transactions/${id}/packaging-photos/verify`, { method: "POST" });
      if (res.ok) {
        setList((prev) => prev.filter((t) => t.id !== id));
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed");
      }
    } finally {
      setActioningId(null);
    }
  };

  const reject = async (id: string) => {
    const notes = rejectNotes[id] ?? "";
    setActioningId(id);
    try {
      const res = await fetch(`/api/transactions/${id}/packaging-photos/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (res.ok) {
        setList((prev) => prev.filter((t) => t.id !== id));
        setRejectNotes((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed");
      }
    } finally {
      setActioningId(null);
    }
  };

  if (loading || !user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-mowing-green/80">
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-mowing-green">Packaging review</h1>
      <p className="mt-1 text-mowing-green/80 text-sm">
        Review seller packaging photos and approve or reject. Approved orders can generate a label.
      </p>
      {loadingList ? (
        <div className="mt-6 text-mowing-green/70">Loading…</div>
      ) : forbidden ? (
        <div className="mt-6 rounded-xl border border-par-3-punch/20 bg-white p-8 text-center text-mowing-green/70">
          You don’t have access to this page.
        </div>
      ) : list.length === 0 ? (
        <div className="mt-6 rounded-xl border border-par-3-punch/20 bg-white p-8 text-center text-mowing-green/70">
          No submissions pending review.
        </div>
      ) : (
        <ul className="mt-6 space-y-6">
          {list.map((tx) => (
            <li
              key={tx.id}
              className="rounded-xl border border-par-3-punch/20 bg-white p-4 flex flex-col gap-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-mowing-green">
                  {tx.listing?.model ?? "Item"} · {tx.listing?.category ?? ""} {tx.listing?.brand ?? ""}
                </span>
                <span className="text-xs text-mowing-green/60">
                  Transaction {tx.id.slice(0, 8)}… · {new Date(tx.created_at).toLocaleString("en-GB")}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Array.from({ length: tx.photoCount ?? tx.photoUrls.length ?? 0 }, (_, i) => (
                  <div key={i} className="rounded-lg overflow-hidden bg-mowing-green/10 aspect-square relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/admin/transactions/${tx.id}/packaging-photo/${i}`}
                      alt={PACKAGING_PHOTO_LABELS[i] ?? `Photo ${i + 1}`}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-1 py-0.5">
                      {PACKAGING_PHOTO_LABELS[i] ?? `Photo ${i + 1}`}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <input
                  type="text"
                  placeholder="Rejection notes (optional)"
                  value={rejectNotes[tx.id] ?? ""}
                  onChange={(e) =>
                    setRejectNotes((prev) => ({ ...prev, [tx.id]: e.target.value }))
                  }
                  className="flex-1 min-w-[200px] rounded border border-mowing-green/30 px-3 py-2 text-sm text-mowing-green"
                />
                <button
                  type="button"
                  onClick={() => reject(tx.id)}
                  disabled={actioningId === tx.id}
                  className="rounded-lg border border-red-300 text-red-700 px-3 py-2 text-sm font-medium hover:bg-red-50 disabled:opacity-70"
                >
                  {actioningId === tx.id ? "…" : "Reject"}
                </button>
                <button
                  type="button"
                  onClick={() => verify(tx.id)}
                  disabled={actioningId === tx.id}
                  className="rounded-lg bg-mowing-green text-off-white-pique px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-70"
                >
                  {actioningId === tx.id ? "…" : "Approve"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
