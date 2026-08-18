"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ModerationActionValue } from "@/lib/seller-reviews";
import { isAlreadyProcessedPayload } from "@/lib/admin-action-centre";

export function AdminFeedbackActions({
  reviewId,
  status,
  onSuccess,
}: {
  reviewId: string;
  status: string;
  onSuccess?: (alreadyProcessed?: boolean) => void;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function run(action: ModerationActionValue) {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/feedback/${reviewId}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: reason.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409 || isAlreadyProcessedPayload(data)) {
          onSuccess?.(true);
          return;
        }
        setError(typeof data.error === "string" ? data.error : "Action failed");
        return;
      }
      setReason("");
      onSuccess?.(false);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-par-3-punch/20 bg-white p-6">
      <h2 className="text-lg font-semibold text-mowing-green">Moderation</h2>
      <label className="mt-3 block text-sm font-medium text-mowing-green" htmlFor="mod-reason">
        Reason (required to hide or remove)
      </label>
      <textarea
        id="mod-reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        className="mt-1 w-full rounded-lg border border-par-3-punch/30 px-3 py-2 text-sm"
        placeholder="Why this action is being taken"
      />
      {error && <p className="mt-2 text-sm text-divot-pink">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!!busy}
          onClick={() => run("keep")}
          className="rounded-lg bg-par-3-punch text-white px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60"
        >
          {busy === "keep" ? "Saving…" : "Keep feedback"}
        </button>
        {status !== "hidden" && (
          <button
            type="button"
            disabled={!!busy}
            onClick={() => run("hide")}
            className="rounded-lg border border-mowing-green/40 text-mowing-green px-4 py-2 text-sm font-medium hover:bg-mowing-green/10 disabled:opacity-60"
          >
            {busy === "hide" ? "Saving…" : "Hide feedback"}
          </button>
        )}
        {status === "hidden" && (
          <button
            type="button"
            disabled={!!busy}
            onClick={() => run("restore")}
            className="rounded-lg border border-mowing-green/40 text-mowing-green px-4 py-2 text-sm font-medium hover:bg-mowing-green/10 disabled:opacity-60"
          >
            {busy === "restore" ? "Saving…" : "Restore feedback"}
          </button>
        )}
        {status !== "removed" && (
          <button
            type="button"
            disabled={!!busy}
            onClick={() => run("remove")}
            className="rounded-lg border border-divot-pink text-divot-pink px-4 py-2 text-sm font-medium hover:bg-divot-pink/10 disabled:opacity-60"
          >
            {busy === "remove" ? "Saving…" : "Remove feedback"}
          </button>
        )}
      </div>
    </div>
  );
}
