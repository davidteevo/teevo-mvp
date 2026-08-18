"use client";

import { FormEvent, useState } from "react";
import { MANUAL_COURIERS } from "@/lib/fulfilment-providers";
import type { StarterPackDispatchDetail } from "@/lib/admin-action-centre-data";
import { OrderWorkflowTimeline } from "./OrderWorkflowTimeline";
import { readActionResponse } from "./actionResult";

export function StarterPackDispatchReview({
  detail,
  onSuccess,
  onAlreadyProcessed,
}: {
  detail: StarterPackDispatchDetail;
  onSuccess: (message: string) => void;
  onAlreadyProcessed: () => void;
}) {
  const tx = detail.transaction;
  const [courier, setCourier] = useState(
    tx.starter_pack_courier && MANUAL_COURIERS.includes(tx.starter_pack_courier as (typeof MANUAL_COURIERS)[number])
      ? tx.starter_pack_courier
      : MANUAL_COURIERS[0]
  );
  const [trackingNumber, setTrackingNumber] = useState(tx.starter_pack_tracking_number ?? "");
  const [trackingUrl, setTrackingUrl] = useState(tx.starter_pack_tracking_url ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (tx.starter_pack_dispatched_at) {
      onAlreadyProcessed();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/transactions/${tx.id}/starter-pack/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courier,
          tracking_number: trackingNumber.trim(),
          tracking_url: trackingUrl.trim(),
          expect_undispatched: true,
        }),
      });
      const result = await readActionResponse(res);
      if (result.ok) {
        onSuccess("Starter Pack marked dispatched ✓");
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
        <p className="text-sm text-mowing-green/80">{detail.seller.name}</p>
        {detail.seller.email && <p className="text-xs text-mowing-green/60">{detail.seller.email}</p>}
      </div>
      <dl className="grid gap-2 text-sm">
        <div>
          <dt className="text-xs text-mowing-green/60">Delivery address</dt>
          <dd className="text-mowing-green">{tx.seller_address || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-mowing-green/60">Requested</dt>
          <dd className="text-mowing-green">
            {new Date(tx.packaging_requested_at ?? tx.created_at).toLocaleString("en-GB")}
          </dd>
        </div>
        {tx.box_type_label && (
          <div>
            <dt className="text-xs text-mowing-green/60">Box</dt>
            <dd className="text-mowing-green">{tx.box_type_label}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs text-mowing-green/60">Current state</dt>
          <dd className="text-mowing-green">
            {tx.starter_pack_dispatched_at ? "Dispatched" : "Needs shipping"}
          </dd>
        </div>
      </dl>

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
        {busy ? "Saving…" : "Mark Starter Pack dispatched"}
      </button>
    </form>
  );
}
