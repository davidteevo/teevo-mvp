import Link from "next/link";
import type { AdminExceptionItem } from "@/lib/admin-action-centre-data";
import { formatWaitingDuration } from "@/lib/admin-action-centre";

export function AdminExceptions({ exceptions }: { exceptions: AdminExceptionItem[] }) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-mowing-green">Exceptions</h2>
      <p className="mt-1 text-sm text-mowing-green/70">
        Orders that are not following the expected workflow.
      </p>
      {exceptions.length === 0 ? (
        <div className="mt-4 rounded-xl border border-par-3-punch/20 bg-white p-5 text-mowing-green">
          <p className="font-semibold">Everything is running normally</p>
          <p className="mt-1 text-sm text-mowing-green/70">No stuck or exceptional orders from current data.</p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-par-3-punch/10 rounded-xl border border-par-3-punch/20 bg-white">
          {exceptions.map((item) => (
            <li key={`${item.type}-${item.id}`} className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div>
                <p className="font-medium text-mowing-green">{item.title}</p>
                <p className="text-sm text-mowing-green/80">{item.detail}</p>
                <p className="mt-1 text-xs text-mowing-green/60">Waiting {formatWaitingDuration(item.since)}</p>
              </div>
              <Link
                href={item.href}
                className="text-sm font-medium text-par-3-punch hover:underline"
              >
                Review order →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
