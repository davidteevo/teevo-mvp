"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { formatPrice } from "@/lib/format";

type Transaction = {
  id: string;
  status: string;
  amount: number;
  created_at: string;
  listing?: { model: string; category: string };
};

export default function DashboardPurchasesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?redirect=${encodeURIComponent("/dashboard/purchases")}`);
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/transactions?role=buyer")
      .then((r) => r.json())
      .then((data) => setTransactions(data.transactions ?? []))
      .catch(() => setTransactions([]));
  }, [user]);

  const confirmReceipt = async (id: string) => {
    const res = await fetch(`/api/transactions/${id}/confirm-receipt`, { method: "POST" });
    if (res.ok) {
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "complete" } : t))
      );
    } else {
      const data = await res.json();
      alert(data.error ?? "Failed");
    }
  };

  if (loading || !user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-mowing-green/80">
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-mowing-green">Purchases</h1>
      <p className="mt-1 text-mowing-green/80">Track orders and confirm when you receive items.</p>
      <div className="mt-6 rounded-xl border border-par-3-punch/20 bg-white overflow-hidden">
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-mowing-green/80">
            No purchases yet.
          </div>
        ) : (
          <ul className="divide-y divide-par-3-punch/10">
            {transactions.map((t) => (
              <li key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium text-mowing-green">{t.listing?.model ?? "Item"}</p>
                  <p className="text-sm text-mowing-green/70">
                    {formatPrice(t.amount)} · {t.status}
                  </p>
                </div>
                {t.status === "shipped" && (
                  <button
                    type="button"
                    onClick={() => confirmReceipt(t.id)}
                    className="rounded-lg bg-par-3-punch text-white px-4 py-2 text-sm font-medium hover:opacity-90"
                  >
                    I received it
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
