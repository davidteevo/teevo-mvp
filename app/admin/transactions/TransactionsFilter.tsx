"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function TransactionsFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("status") ?? "";

  const onChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("status", value);
    else next.delete("status");
    router.push(`/admin/transactions${next.toString() ? `?${next}` : ""}`);
  };

  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-mowing-green/30 bg-white px-3 py-2 text-sm text-mowing-green mt-4 block"
    >
      <option value="">All statuses</option>
      <option value="pending">Pending</option>
      <option value="shipped">Shipped</option>
      <option value="complete">Complete</option>
      <option value="refunded">Refunded</option>
      <option value="dispute">Dispute</option>
    </select>
  );
}
