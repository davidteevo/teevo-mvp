"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { MANUAL_COURIERS } from "@/lib/fulfilment-providers";

type AwaitingTx = {
  id: string;
  created_at: string;
  shipping_fee_gbp: number | null;
  fulfilment_status: string | null;
  item: string;
  buyer: { name: string; email: string | null };
  seller: { name: string; email: string | null };
  shipping_address: string;
};

export default function AdminFulfilmentPage() {
  const [list, setList] = useState<AwaitingTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalTx, setModalTx] = useState<AwaitingTx | null>(null);
  const [courier, setCourier] = useState<string>(MANUAL_COURIERS[0]);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [dispatchDate, setDispatchDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [labelFile, setLabelFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/fulfilment/awaiting-labels")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Failed to load");
        setList(data.transactions ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openModal = (tx: AwaitingTx) => {
    setModalTx(tx);
    setCourier(MANUAL_COURIERS[0]);
    setTrackingNumber("");
    setTrackingUrl("");
    setDispatchDate(new Date().toISOString().slice(0, 10));
    setLabelFile(null);
    setFormError(null);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalTx(null);
    setFormError(null);
  };

  const submitLabel = async (e: FormEvent) => {
    e.preventDefault();
    if (!modalTx) return;
    if (!labelFile) {
      setFormError("Please attach the shipping label PDF.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const form = new FormData();
      form.set("courier", courier);
      form.set("tracking_number", trackingNumber.trim());
      form.set("tracking_url", trackingUrl.trim());
      form.set("dispatch_date", dispatchDate);
      form.set("label", labelFile);

      const res = await fetch(`/api/admin/transactions/${modalTx.id}/manual-label`, {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to provide label");

      setList((prev) => prev.filter((t) => t.id !== modalTx.id));
      setModalTx(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to provide label");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (iso: string) => {
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
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-mowing-green">Awaiting labels</h1>
      <p className="mt-1 text-mowing-green/80 text-sm">
        Manual fulfilment orders with packaging verified. Provide courier tracking and the label PDF;
        Teevo emails the seller automatically.
      </p>

      {loading ? (
        <p className="mt-6 text-mowing-green/70">Loading…</p>
      ) : error ? (
        <p className="mt-6 text-red-600" role="alert">
          {error}
        </p>
      ) : list.length === 0 ? (
        <p className="mt-6 text-mowing-green/70">No orders awaiting a shipping label.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-par-3-punch/20 bg-white">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-off-white-pique text-mowing-green/80">
              <tr>
                <th className="px-3 py-2 font-medium">Order</th>
                <th className="px-3 py-2 font-medium">Buyer</th>
                <th className="px-3 py-2 font-medium">Seller</th>
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 font-medium">Payment</th>
                <th className="px-3 py-2 font-medium">Address</th>
                <th className="px-3 py-2 font-medium">Shipping</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {list.map((tx) => (
                <tr key={tx.id} className="border-t border-par-3-punch/10 align-top">
                  <td className="px-3 py-3 font-mono text-xs">#{tx.id.slice(0, 8)}</td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-mowing-green">{tx.buyer.name}</div>
                    {tx.buyer.email && (
                      <div className="text-xs text-mowing-green/60">{tx.buyer.email}</div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-mowing-green">{tx.seller.name}</div>
                    {tx.seller.email && (
                      <div className="text-xs text-mowing-green/60">{tx.seller.email}</div>
                    )}
                  </td>
                  <td className="px-3 py-3">{tx.item}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{formatDate(tx.created_at)}</td>
                  <td className="px-3 py-3 max-w-[14rem] text-mowing-green/80">{tx.shipping_address}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {tx.shipping_fee_gbp != null ? `£${Number(tx.shipping_fee_gbp).toFixed(2)}` : "—"}
                  </td>
                  <td className="px-3 py-3">Preparing for dispatch</td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => openModal(tx)}
                      className="rounded-lg bg-par-3-punch text-white px-3 py-1.5 text-sm font-medium hover:opacity-90"
                    >
                      Provide label
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalTx && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="provide-label-title"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="provide-label-title" className="text-lg font-semibold text-mowing-green">
              Provide shipping label
            </h2>
            <p className="mt-1 text-sm text-mowing-green/70">
              Order #{modalTx.id.slice(0, 8)} · {modalTx.item}
            </p>

            <form className="mt-4 space-y-4" onSubmit={submitLabel}>
              <label className="block text-sm">
                <span className="font-medium text-mowing-green">Courier</span>
                <select
                  className="mt-1 w-full rounded-lg border border-par-3-punch/30 px-3 py-2"
                  value={courier}
                  onChange={(e) => setCourier(e.target.value)}
                  required
                >
                  {MANUAL_COURIERS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="font-medium text-mowing-green">Tracking number</span>
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-par-3-punch/30 px-3 py-2"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  required
                />
              </label>

              <label className="block text-sm">
                <span className="font-medium text-mowing-green">Tracking URL</span>
                <input
                  type="url"
                  className="mt-1 w-full rounded-lg border border-par-3-punch/30 px-3 py-2"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="https://"
                  required
                />
              </label>

              <label className="block text-sm">
                <span className="font-medium text-mowing-green">Dispatch date</span>
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-par-3-punch/30 px-3 py-2"
                  value={dispatchDate}
                  onChange={(e) => setDispatchDate(e.target.value)}
                />
              </label>

              <label className="block text-sm">
                <span className="font-medium text-mowing-green">Label PDF</span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="mt-1 w-full text-sm"
                  onChange={(e) => setLabelFile(e.target.files?.[0] ?? null)}
                  required
                />
              </label>

              {formError && (
                <p className="text-sm text-red-600" role="alert">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-lg border border-par-3-punch/30 px-4 py-2 text-sm font-medium text-mowing-green hover:bg-off-white-pique disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-par-3-punch text-white px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60"
                >
                  {submitting ? "Sending…" : "Send label to seller"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
