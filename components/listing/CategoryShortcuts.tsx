"use client";

import Link from "next/link";
import type { ListingCategory } from "@/types/database";

const CATEGORIES: { value: ListingCategory; label: string }[] = [
  { value: "Driver", label: "Driver" },
  { value: "Irons", label: "Iron Sets" },
  { value: "Putter", label: "Putters" },
  { value: "Wedges", label: "Wedges" },
  { value: "Woods", label: "Fairway Woods" },
  { value: "Bag", label: "Bags" },
  { value: "Apparel", label: "Apparel" },
];

export function CategoryShortcuts() {
  return (
    <section className="mb-6" aria-label="Browse by category">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-mowing-green/60 mb-3">
        Browse by category
      </h2>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(({ value, label }) => (
          <Link
            key={value}
            href={`/?category=${encodeURIComponent(value)}`}
            className="rounded-full border border-mowing-green/30 bg-white/80 px-4 py-2 text-sm font-medium text-mowing-green hover:bg-mowing-green/10 hover:border-mowing-green/50 transition-colors focus:outline-none focus:ring-2 focus:ring-mowing-green/40"
          >
            {label}
          </Link>
        ))}
      </div>
    </section>
  );
}
