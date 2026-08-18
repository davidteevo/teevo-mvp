"use client";

import { FormEvent, useState } from "react";
import { MANUAL_COURIERS } from "@/lib/fulfilment-providers";
import type { ShippingLabelDetail } from "@/lib/admin-action-centre-data";
import { OrderWorkflowTimeline } from "./OrderWorkflowTimeline";
import { readActionResponse } from "./actionResult";

export function ShippingLabelReview({
  detail,
  onSuccess,
  onAlreadyProcessed,
}: {
  detail: ShippingLabelDetail;
  onSuccess: (message: string) => void;
  onAlreadyProcessed: () => void;
}) {
  const tx = detail.transaction;
  const [courier, setCourier] = useState<string>(MANUAL_COURIERS[0]);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [dispatchDate, setDispatchDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [labelFile, setLabelFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!labelFile) {
      setError("Please attach the shipping label PDF.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("courier", courier);
      form.set("tracking_number", trackingNumber.trim());
      form.set("tracking_url", trackingUrl.trim());
      form.set("dispatch_date", dispatchDate);
      form.set("label", labelFile);
      const res = await fetch(`/api/admin/transactions/${tx.id}/manual-label`, {
        method: "POST",
        body: form,
      });
      const result = await readActionResponse(res);
      if (result.ok) {
        onSuccess("Shipping label sent to seller ✓");
        return;
      }
      if (result.alreadyProcessed) onAlreadyProcessed();
      else setError(result.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div>
        <h3 className="text-lg font-bold text-mowing-green">{detail.title}</h3>
        <p className="text-sm text-mowing-green/80">Seller: {detail.seller.name}</p>
        <p className="text-sm text-mowing-green/80">Buyer: {detail.buyer.name}</p>
        <p className="mt-1 font-mono text-xs text-mowing-green/50">Order #{tx.id.slice(0, 8)}</p>
      </div>
      <div className="text-sm text-mowing-green">
        <p className="text-xs text-mowing-green/60">Shipping address</p>
        <p>{tx.shipping_address || "—"}</p>
        {tx.shipping_fee_gbp != null && (
          <p className="mt-1 text-mowing-green/70">Shipping fee £{Number(tx.shipping_fee_gbp).toFixed(2)}</p>
        )}
      </div>

      <OrderWorkflowTimeline
        stages={detail.timeline.stages}
        currentStageLabel={detail.timeline.currentStageLabel}
        nextActionLabel={detail.timeline.nextActionLabel}
      />

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

      {error && (
        <p className="text-sm text-divot-pink" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-par-3-punch text-white px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Sending…" : "Send label to seller"}
      </button>
    </form>
  );
}
