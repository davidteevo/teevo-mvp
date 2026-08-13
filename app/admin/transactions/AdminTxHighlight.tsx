"use client";

import { useEffect, useState } from "react";

export function AdminTxHighlight({ id }: { id?: string }) {
  useEffect(() => {
    if (!id) return;
    document.getElementById(`tx-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [id]);
  return null;
}

export function ResolveOpsButton({ transactionId }: { transactionId: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return <span className="text-xs text-mowing-green/70">Ops issue marked resolved</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const res = await fetch(`/api/admin/transactions/${transactionId}/resolve-ops-issue`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error ?? "Failed");
            setDone(true);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Failed");
          } finally {
            setBusy(false);
          }
        }}
        className="rounded-lg border border-par-3-punch/30 text-par-3-punch px-3 py-1.5 text-xs font-medium hover:bg-par-3-punch/10 disabled:opacity-70"
      >
        {busy ? "Resolving…" : "Resolve ops issue"}
      </button>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </div>
  );
}
