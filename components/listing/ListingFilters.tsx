"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

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

const SHAFT_FLEX_OPTIONS = ["Senior", "Regular", "Stiff", "X-Stiff", "Other"];

export function ListingFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [moreOpen, setMoreOpen] = useState(false);

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.push(`/?${next.toString()}`);
    },
    [router, searchParams]
  );

  const brand = searchParams.get("brand") ?? "";
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";
  const search = searchParams.get("search") ?? "";
  const shaft = searchParams.get("shaft") ?? "";
  const shaftFlex = searchParams.get("shaftFlex") ?? "";
  const degree = searchParams.get("degree") ?? "";
  const handed = searchParams.get("handed") ?? "";

  const hasAnyFilter =
    searchParams.get("category") || brand || minPrice || maxPrice || search || shaft || shaftFlex || degree || handed;

  return (
    <div className="mb-4">
      {/* Primary row: Brand | Price */}
      <div className="flex flex-wrap items-end gap-3 py-2">
        <div>
          <label className="block text-xs font-medium text-mowing-green/70 mb-0.5">Brand</label>
          <select
            value={brand}
            onChange={(e) => setParam("brand", e.target.value || null)}
            className="rounded-lg border border-mowing-green/30 bg-white px-3 py-1.5 text-sm text-mowing-green min-w-[120px]"
          >
            <option value="">All</option>
            {BRANDS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="block text-xs font-medium text-mowing-green/70 mb-0.5">Min (£)</label>
            <input
              type="number"
              min={0}
              step={1}
              value={minPrice}
              onChange={(e) => setParam("minPrice", e.target.value || null)}
              placeholder="0"
              className="w-20 rounded-lg border border-mowing-green/30 bg-white px-2 py-1.5 text-sm text-mowing-green"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-mowing-green/70 mb-0.5">Max (£)</label>
            <input
              type="number"
              min={0}
              step={1}
              value={maxPrice}
              onChange={(e) => setParam("maxPrice", e.target.value || null)}
              placeholder="Any"
              className="w-20 rounded-lg border border-mowing-green/30 bg-white px-2 py-1.5 text-sm text-mowing-green"
            />
          </div>
        </div>
        {hasAnyFilter && (
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-xs text-par-3-punch hover:underline pb-1.5"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Expandable: More filters */}
      <div className="border-t border-mowing-green/10 pt-2 mt-1">
        <button
          type="button"
          onClick={() => setMoreOpen((o) => !o)}
          className="flex items-center gap-1 text-xs font-medium text-mowing-green/80 hover:text-mowing-green"
          aria-expanded={moreOpen}
        >
          {moreOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          More filters
        </button>
        {moreOpen && (
          <div className="flex flex-wrap items-end gap-3 mt-3 pl-4 border-l-2 border-mowing-green/10">
            <div>
              <label className="block text-xs font-medium text-mowing-green/70 mb-0.5">Search</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setParam("search", e.target.value || null)}
                placeholder="Model, shaft..."
                className="w-40 rounded-lg border border-mowing-green/30 bg-white px-2 py-1.5 text-sm text-mowing-green placeholder:text-mowing-green/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-mowing-green/70 mb-0.5">Loft / degree</label>
              <input
                type="text"
                value={degree}
                onChange={(e) => setParam("degree", e.target.value || null)}
                placeholder="e.g. 10.5"
                className="w-24 rounded-lg border border-mowing-green/30 bg-white px-2 py-1.5 text-sm text-mowing-green placeholder:text-mowing-green/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-mowing-green/70 mb-0.5">Shaft</label>
              <input
                type="text"
                value={shaft}
                onChange={(e) => setParam("shaft", e.target.value || null)}
                placeholder="e.g. Ventus"
                className="w-32 rounded-lg border border-mowing-green/30 bg-white px-2 py-1.5 text-sm text-mowing-green placeholder:text-mowing-green/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-mowing-green/70 mb-0.5">Shaft flex</label>
              <select
                value={shaftFlex}
                onChange={(e) => setParam("shaftFlex", e.target.value || null)}
                className="rounded-lg border border-mowing-green/30 bg-white px-2 py-1.5 text-sm text-mowing-green min-w-[100px]"
              >
                <option value="">Any</option>
                {SHAFT_FLEX_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-mowing-green/70 mb-0.5">Handed</label>
              <select
                value={handed}
                onChange={(e) => setParam("handed", e.target.value || null)}
                className="rounded-lg border border-mowing-green/30 bg-white px-2 py-1.5 text-sm text-mowing-green min-w-[100px]"
              >
                <option value="">Any</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
