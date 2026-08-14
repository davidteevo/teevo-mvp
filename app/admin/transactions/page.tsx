import Link from "next/link";
import { Suspense } from "react";
import { formatPrice } from "@/lib/format";
import { getAdminTransactions } from "@/lib/admin-data";
import TransactionsFilter from "./TransactionsFilter";
import { AdminTxHighlight, ResolveOpsButton } from "./AdminTxHighlight";

type Props = { searchParams: Promise<{ status?: string; id?: string }> };

export default async function AdminTransactionsPage({ searchParams }: Props) {
  const params = await searchParams;
  const status = params.status ?? undefined;
  const highlightId = params.id ?? undefined;
  const transactions = await getAdminTransactions(status);

  return (
    <div>
      <h1 className="text-2xl font-bold text-mowing-green">Transactions</h1>
      <p className="mt-1 text-mowing-green/80">View and monitor all transactions.</p>
      <AdminTxHighlight id={highlightId} />
      <Suspense fallback={<div className="mt-4 h-10" />}>
        <TransactionsFilter />
      </Suspense>
      <div className="mt-6 rounded-xl border border-par-3-punch/20 bg-white overflow-hidden">
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-mowing-green/80">
            No transactions.
          </div>
        ) : (
          <ul className="divide-y divide-par-3-punch/10">
            {transactions.map((t) => (
              <li
                key={t.id}
                id={`tx-${t.id}`}
                className={`flex flex-wrap items-center justify-between gap-3 p-4${
                  highlightId === t.id ? " bg-par-3-punch/10 ring-2 ring-inset ring-par-3-punch" : ""
                }`}
              >
                <div>
                  <p className="font-medium text-mowing-green">
                    <Link href={`/admin/transactions/${t.id}`} className="hover:underline">
                      {t.listing?.model ?? t.listing_id}
                    </Link>
                  </p>
                  <p className="text-xs text-mowing-green/60">
                    {t.id.slice(0, 8)}… · {formatPrice(t.amount)} · {t.status}
                    {t.dispatch_deadline_at ? ` · ship by ${new Date(t.dispatch_deadline_at).toLocaleDateString("en-GB")}` : ""}
                    {t.cancellation_status ? ` · ${t.cancellation_status}` : ""}
                  </p>
                  {t.packaging_source === "TEEVO_STARTER_PACK" && (
                    <span className="mt-1 inline-flex items-center rounded-full border border-par-3-punch/30 bg-off-white-pique px-2 py-0.5 text-xs font-medium text-mowing-green">
                      Starter Pack — {t.starter_pack_dispatched_at ? "Dispatched" : "Free Box"}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-sm text-mowing-green/70">
                    {new Date(t.created_at).toLocaleDateString()}
                  </span>
                  <Link
                    href={`/admin/transactions/${t.id}`}
                    className="text-xs font-medium text-par-3-punch hover:underline"
                  >
                    Review order
                  </Link>
                  {highlightId === t.id && <ResolveOpsButton transactionId={t.id} />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
