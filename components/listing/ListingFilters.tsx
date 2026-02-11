"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { ListingCategory } from "@/types/database";

const CATEGORIES: ListingCategory[] = [
  "Driver",
  "Irons",
  "Wedges",
  "Putter",
  "Apparel",
  "Bag",
];

const BRANDS = [
  "Titleist",
  "Callaway",
  "TaylorMade",
  "Ping",
  "Cobra",
  "Mizuno",
  "Srixon",
  "Wilson",
  "Other",
];

export function ListingFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.push(`/?${next.toString()}`);
    },
    [router, searchParams]
  );

  const category = searchParams.get("category") ?? "";
  const brand = searchParams.get("brand") ?? "";
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";

  return (
    <div className="flex flex-wrap gap-4 mb-6 p-4 rounded-xl bg-white/60 border border-par-3-punch/20">
      <div>
        <label className="block text-xs font-medium text-mowing-green/70 mb-1">
          Category
        </label>
        <select
          value={category}
          onChange={(e) => setParam("category", e.target.value || null)}
          className="rounded-lg border border-mowing-green/30 bg-white px-3 py-2 text-sm text-mowing-green"
        >
          <option value="">All</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-mowing-green/70 mb-1">
          Brand
        </label>
        <select
          value={brand}
          onChange={(e) => setParam("brand", e.target.value || null)}
          className="rounded-lg border border-mowing-green/30 bg-white px-3 py-2 text-sm text-mowing-green"
        >
          <option value="">All</option>
          {BRANDS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-mowing-green/70 mb-1">
          Min price (£)
        </label>
        <input
          type="number"
          min="0"
          step="1"
          value={minPrice}
          onChange={(e) => setParam("minPrice", e.target.value || null)}
          placeholder="0"
          className="w-24 rounded-lg border border-mowing-green/30 bg-white px-3 py-2 text-sm text-mowing-green"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-mowing-green/70 mb-1">
          Max price (£)
        </label>
        <input
          type="number"
          min="0"
          step="1"
          value={maxPrice}
          onChange={(e) => setParam("maxPrice", e.target.value || null)}
          placeholder="Any"
          className="w-24 rounded-lg border border-mowing-green/30 bg-white px-3 py-2 text-sm text-mowing-green"
        />
      </div>
      {(category || brand || minPrice || maxPrice) && (
        <button
          type="button"
          onClick={() => router.push("/")}
          className="self-end text-sm text-par-3-punch hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
