import { formatPrice } from "@/lib/format";
import type { AdminBusinessMetrics } from "@/lib/admin-action-centre-data";

export function AdminBusinessMetricsRow({ metrics }: { metrics: AdminBusinessMetrics }) {
  const cells = [
    { label: "Total listings", value: String(metrics.totalListings) },
    { label: "Verified listings", value: String(metrics.verifiedCount) },
    { label: "Sold listings", value: String(metrics.soldCount) },
    { label: "Users", value: String(metrics.usersCount) },
    { label: "Transactions", value: String(metrics.txCount) },
    { label: "GMV", value: formatPrice(metrics.gmv) },
  ];

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-mowing-green">Business overview</h2>
      <p className="mt-1 text-sm text-mowing-green/70">Snapshot of marketplace volume. Not a work queue.</p>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cells.map((cell) => (
          <div key={cell.label} className="rounded-xl border border-par-3-punch/20 bg-white px-3 py-3">
            <p className="text-xs text-mowing-green/60">{cell.label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-mowing-green">{cell.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
