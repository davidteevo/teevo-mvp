import { Suspense } from "react";
import { formatPrice } from "@/lib/format";
import { getAdminTransactions } from "@/lib/admin-data";
import TransactionsFilter from "./TransactionsFilter";

type Props = { searchParams: Promise<{ status?: string }> };

export default async function AdminTransactionsPage({ searchParams }: Props) {
  const params = await searchParams;
  const status = params.status ?? undefined;
  const transactions = await getAdminTransactions(status);

  return (
    <div>
      <h1 className="text-2xl font-bold text-mowing-green">Transactions</h1>
      <p className="mt-1 text-mowing-green/80">View and monitor all transactions.</p>
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
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium text-mowing-green">{t.listing?.model ?? t.listing_id}</p>
                  <p className="text-xs text-mowing-green/60">
                    {t.id.slice(0, 8)}… · {formatPrice(t.amount)} · {t.status}
                  </p>
                </div>
                <span className="text-sm text-mowing-green/70">
                  {new Date(t.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
