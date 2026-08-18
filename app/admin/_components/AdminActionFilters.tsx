"use client";

import {
  ACTION_CENTRE_FILTERS,
  type AdminActionCounts,
  type AdminActionFilterValue,
} from "@/lib/admin-action-centre";

export function AdminActionFilters({
  value,
  counts,
  onChange,
}: {
  value: AdminActionFilterValue;
  counts: AdminActionCounts;
  onChange: (next: AdminActionFilterValue) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Action Centre filters">
      {ACTION_CENTRE_FILTERS.map((filter) => {
        const count = counts[filter.id];
        const selected = value === filter.id;
        return (
          <button
            key={filter.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(filter.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              selected
                ? "bg-mowing-green text-off-white-pique"
                : "border border-par-3-punch/30 text-mowing-green hover:bg-off-white-pique"
            }`}
          >
            {filter.label}
            <span className={`ml-1.5 tabular-nums ${selected ? "text-off-white-pique/80" : "text-mowing-green/60"}`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
