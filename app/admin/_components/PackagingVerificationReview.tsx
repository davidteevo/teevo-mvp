"use client";

import { useState } from "react";
import { PACKAGING_PHOTO_LABELS } from "@/lib/fulfilment";
import type { PackagingVerificationDetail } from "@/lib/admin-action-centre-data";
import { OrderWorkflowTimeline } from "./OrderWorkflowTimeline";
import { readActionResponse } from "./actionResult";

export function PackagingVerificationReview({
  detail,
  onSuccess,
  onAlreadyProcessed,
}: {
  detail: PackagingVerificationDetail;
  onSuccess: (message: string) => void;
  onAlreadyProcessed: () => void;
}) {
  const tx = detail.transaction;
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const run = async (type: "verify" | "reject") => {
    setBusy(type);
    setError(null);
    try {
      const res = await fetch(`/api/transactions/${tx.id}/packaging-photos/${type}`, {
        method: "POST",
        headers: type === "reject" ? { "Content-Type": "application/json" } : undefined,
        body: type === "reject" ? JSON.stringify({ notes }) : undefined,
      });
      const result = await readActionResponse(res);
      if (result.ok) {
        onSuccess(type === "verify" ? "Packaging approved ✓" : "Packaging rejected ✓");
        return;
      }
      if (result.alreadyProcessed) onAlreadyProcessed();
      else setError(result.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-bold text-mowing-green">{detail.title}</h3>
        <p className="text-sm text-mowing-green/80">{detail.seller.name}</p>
        {detail.seller.email && <p className="text-xs text-mowing-green/60">{detail.seller.email}</p>}
        <p className="mt-1 font-mono text-xs text-mowing-green/50">Order #{tx.id.slice(0, 8)}</p>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-xs text-mowing-green/60">Packaging</dt>
          <dd className="text-mowing-green">{tx.packaging_source ?? tx.shipping_package ?? "—"}</dd>
        </div>
        {tx.box_type_label && (
          <div>
            <dt className="text-xs text-mowing-green/60">Box</dt>
            <dd className="text-mowing-green">{tx.box_type_label}</dd>
          </div>
        )}
      </dl>

      {(tx.packaging_review_notes || tx.review_notes) && (
        <p className="text-sm text-mowing-green/80">
          Previous notes: {tx.packaging_review_notes || tx.review_notes}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: tx.photoCount }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setPreviewIndex(i)}
            className="rounded-lg overflow-hidden bg-mowing-green/10 aspect-square relative"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/admin/transactions/${tx.id}/packaging-photo/${i}`}
              alt={PACKAGING_PHOTO_LABELS[i] ?? `Photo ${i + 1}`}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-1 py-0.5">
              {PACKAGING_PHOTO_LABELS[i] ?? `Photo ${i + 1}`}
            </span>
          </button>
        ))}
      </div>

      {previewIndex != null && (
        <div
          className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewIndex(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/admin/transactions/${tx.id}/packaging-photo/${previewIndex}`}
            alt={PACKAGING_PHOTO_LABELS[previewIndex] ?? "Packaging photo"}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      )}

      <OrderWorkflowTimeline
        stages={detail.timeline.stages}
        currentStageLabel={detail.timeline.currentStageLabel}
        nextActionLabel={detail.timeline.nextActionLabel}
      />

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Rejection notes (optional)"
        rows={2}
        className="w-full rounded-lg border border-par-3-punch/30 px-3 py-2 text-sm"
      />

      {error && (
        <p className="text-sm text-divot-pink" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!!busy}
          onClick={() => run("verify")}
          className="rounded-lg bg-par-3-punch text-white px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60"
        >
          {busy === "verify" ? "Approving…" : "Approve packaging"}
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => run("reject")}
          className="rounded-lg border border-divot-pink text-divot-pink px-4 py-2 text-sm font-medium hover:bg-divot-pink/10 disabled:opacity-60"
        >
          {busy === "reject" ? "Rejecting…" : "Reject / request new photos"}
        </button>
      </div>
    </div>
  );
}
