"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BOX_TYPE_LABELS, type BoxType } from "@/lib/fulfilment";

type StarterPackRequest = {
  id: string;
  created_at: string;
  packaging_requested_at: string | null;
  starter_pack_dispatched_at: string | null;
  starter_pack_admin_notified_at: string | null;
  box_type: string | null;
  packaging_status: string | null;
  item: string;
  category: string | null;
  seller: { name: string; email: string | null };
  seller_address: string;
};

type Filter = "needs_shipping" | "dispatched" | "all";

function boxLabel(boxType: string | null) {
  if (boxType && boxType in BOX_TYPE_LABELS) return BOX_TYPE_LABELS[boxType as BoxType];
  return boxType ?? "—";
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function AdminStarterPacksContent() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("id");
  const [filter, setFilter] = useState<Filter>("needs_shipping");
  const [list, setList] = useState<StarterPackRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/starter-packs?status=${filter}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Failed to load");
        setList(data.requests ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`starter-pack-${highlightId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId, list]);

  const filters = useMemo(
    () =>
      [
        { id: "needs_shipping" as const, label: "Needs shipping" },
        { id: "dispatched" as const, label: "Dispatched" },
        { id: "all" as const, label: "All" },
      ],
    []
  );

  const markDispatched = async (id: string) => {
    setActioningId(id);
    try {
      const res = await fetch(`/api/admin/transactions/${id}/starter-pack/dispatch`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to mark dispatched");
      if (filter === "needs_shipping") {
        setList((prev) => prev.filter((t) => t.id !== id));
      } else {
        setList((prev) =>
          prev.map((t) =>
            t.id === id
              ? { ...t, starter_pack_dispatched_at: data.starter_pack_dispatched_at ?? new Date().toISOString() }
              : t
          )
        );
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setActioningId(null);
    }
  };

  const resendNotification = async (id: string) => {
    setActioningId(id);
    try {
      const res = await fetch(`/api/admin/transactions/${id}/starter-pack/notify`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to resend");
      setList((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, starter_pack_admin_notified_at: data.starter_pack_admin_notified_at ?? new Date().toISOString() }
            : t
        )
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-mowing-green">Starter Packs</h1>
      <p className="mt-1 text-mowing-green/80 text-sm">
        Free boxes requested by sellers. Ship the box, then mark it as dispatched so the seller can continue.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filter === f.id
                ? "bg-mowing-green text-off-white-pique"
                : "border border-par-3-punch/30 text-mowing-green hover:bg-off-white-pique"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-6 text-mowing-green/70">Loading…</p>
      ) : error ? (
        <p className="mt-6 text-red-600" role="alert">
          {error}
        </p>
      ) : list.length === 0 ? (
        <p className="mt-6 text-mowing-green/70">No Starter Pack requests in this view.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-par-3-punch/20 bg-white">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-off-white-pique text-mowing-green/80">
              <tr>
                <th className="px-3 py-2 font-medium">Order</th>
                <th className="px-3 py-2 font-medium">Seller</th>
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 font-medium">Box</th>
                <th className="px-3 py-2 font-medium">Requested</th>
                <th className="px-3 py-2 font-medium">Address</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {list.map((tx) => {
                const dispatched = !!tx.starter_pack_dispatched_at;
                const highlighted = highlightId === tx.id;
                return (
                  <tr
                    key={tx.id}
                    id={`starter-pack-${tx.id}`}
                    className={`border-t border-par-3-punch/10 align-top ${
                      highlighted ? "bg-golden-tee/15" : ""
                    }`}
                  >
                    <td className="px-3 py-3 font-mono text-xs">#{tx.id.slice(0, 8)}</td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-mowing-green">{tx.seller.name}</div>
                      {tx.seller.email && (
                        <div className="text-xs text-mowing-green/60">{tx.seller.email}</div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div>{tx.item}</div>
                      {tx.category && (
                        <div className="text-xs text-mowing-green/60">{tx.category}</div>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">{boxLabel(tx.box_type)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {formatDate(tx.packaging_requested_at ?? tx.created_at)}
                    </td>
                    <td className="px-3 py-3 max-w-[14rem] text-mowing-green/80">
                      {tx.seller_address || "—"}
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center rounded-full border border-par-3-punch/30 bg-off-white-pique px-2 py-0.5 text-xs font-medium text-mowing-green">
                        Starter Pack — Free Box
                      </span>
                      <div className="mt-1 text-xs text-mowing-green/70">
                        {dispatched ? "Starter Pack — Dispatched" : "Starter Pack — Needs Shipping"}
                      </div>
                      {tx.packaging_status && (
                        <div className="mt-0.5 text-xs text-mowing-green/50">
                          Photos: {tx.packaging_status}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 space-y-2">
                      {dispatched ? (
                        <p className="text-xs text-mowing-green/70">
                          Dispatched {formatDate(tx.starter_pack_dispatched_at)}
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => markDispatched(tx.id)}
                          disabled={actioningId === tx.id}
                          className="rounded-lg bg-par-3-punch text-white px-3 py-1.5 text-sm font-medium hover:opacity-90 disabled:opacity-70"
                        >
                          {actioningId === tx.id ? "Saving…" : "Mark Starter Pack as Dispatched"}
                        </button>
                      )}
                      {!tx.starter_pack_admin_notified_at && (
                        <button
                          type="button"
                          onClick={() => resendNotification(tx.id)}
                          disabled={actioningId === tx.id}
                          className="block rounded-lg border border-par-3-punch/40 px-3 py-1.5 text-xs font-medium text-mowing-green hover:bg-off-white-pique disabled:opacity-70"
                        >
                          Resend notification
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminStarterPacksPage() {
  return (
    <Suspense fallback={<p className="text-mowing-green/70">Loading…</p>}>
      <AdminStarterPacksContent />
    </Suspense>
  );
}
