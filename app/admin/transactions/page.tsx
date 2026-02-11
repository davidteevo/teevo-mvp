"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/format";

type Transaction = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  status: string;
  shipped_at: string | null;
  completed_at: string | null;
  created_at: string;
  listing?: { model: string };
};

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const url = statusFilter ? `/api/admin/transactions?status=${statusFilter}` : "/api/admin/transactions";
    fetch(url)
      .then((r) => r.json())
      .then((data) => setTransactions(data.transactions ?? []))
      .catch(() => setTransactions([]));
  }, [statusFilter]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-mowing-green">Transactions</h1>
      <p className="mt-1 text-mowing-green/80">View and monitor all transactions.</p>
      <div className="mt-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-mowing-green/30 bg-white px-3 py-2 text-sm text-mowing-green"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="shipped">Shipped</option>
          <option value="complete">Complete</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>
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
