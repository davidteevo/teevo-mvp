"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function FeedbackFilters() {
  const router = useRouter();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("id");
    router.push(`/admin/feedback?${next.toString()}`);
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <input
        defaultValue={params.get("q") ?? ""}
        placeholder="Search review, order, product…"
        className="rounded-lg border border-par-3-punch/30 bg-white px-3 py-2 text-sm min-w-[180px]"
        onKeyDown={(e) => {
          if (e.key === "Enter") setParam("q", (e.target as HTMLInputElement).value.trim());
        }}
      />
      <select
        value={params.get("requires_action") === "1" ? "1" : ""}
        onChange={(e) => setParam("requires_action", e.target.value)}
        className="rounded-lg border border-par-3-punch/30 bg-white px-3 py-2 text-sm"
      >
        <option value="">All</option>
        <option value="1">Requires action</option>
      </select>
      <select
        value={params.get("status") ?? ""}
        onChange={(e) => setParam("status", e.target.value)}
        className="rounded-lg border border-par-3-punch/30 bg-white px-3 py-2 text-sm"
      >
        <option value="">Any status</option>
        <option value="active">Active</option>
        <option value="hidden">Hidden</option>
        <option value="removed">Removed</option>
      </select>
      <select
        value={params.get("rating") ?? ""}
        onChange={(e) => setParam("rating", e.target.value)}
        className="rounded-lg border border-par-3-punch/30 bg-white px-3 py-2 text-sm"
      >
        <option value="">Any rating</option>
        {[5, 4, 3, 2, 1].map((n) => (
          <option key={n} value={String(n)}>
            {n} star{n === 1 ? "" : "s"}
          </option>
        ))}
      </select>
      <select
        value={params.get("reported") === "1" ? "1" : ""}
        onChange={(e) => setParam("reported", e.target.value)}
        className="rounded-lg border border-par-3-punch/30 bg-white px-3 py-2 text-sm"
      >
        <option value="">All reports</option>
        <option value="1">Reported</option>
      </select>
    </div>
  );
}
