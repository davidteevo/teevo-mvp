"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { searchParamsToHomeState } from "@/lib/home-filter-url";

const CATEGORY_LABELS: Record<string, string> = {
  Driver: "Driver",
  Woods: "Fairway woods",
  "Driving Irons": "Driving irons",
  Hybrids: "Hybrids",
  Irons: "Irons",
  Wedges: "Wedges",
  Putter: "Putters",
  Bag: "Bags",
  Clothing: "Clothing",
  Accessories: "Accessories",
};

const CONDITION_LABELS: Record<string, string> = {
  New: "New",
  Excellent: "Excellent",
  Good: "Good",
  Fair: "Fair",
  Used: "Used",
  "New with tags": "New with tags",
  "New without tags": "New without tags",
};

const SORT_LABELS: Record<string, string> = {
  newest: "Newest",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
};

type Chip = { key: string; label: string; clear: () => URLSearchParams };

export function ActiveFilterChips() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sp = new URLSearchParams(searchParams.toString());
  const s = searchParamsToHomeState(sp);

  const chips: Chip[] = [];

  if (s.category) {
    chips.push({
      key: "category",
      label: `Category: ${CATEGORY_LABELS[s.category] ?? s.category}`,
      clear: () => {
        const n = new URLSearchParams(sp.toString());
        n.delete("category");
        return n;
      },
    });
  }
  if (s.brand) {
    chips.push({
      key: "brand",
      label: `Brand: ${s.brand}`,
      clear: () => {
        const n = new URLSearchParams(sp.toString());
        n.delete("brand");
        return n;
      },
    });
  }
  if (s.minPrice || s.maxPrice) {
    const min = s.minPrice ? `£${s.minPrice}` : "£0";
    const max = s.maxPrice ? `£${s.maxPrice}` : "£500+";
    chips.push({
      key: "price",
      label: `Price: ${min}–${max}`,
      clear: () => {
        const n = new URLSearchParams(sp.toString());
        n.delete("minPrice");
        n.delete("maxPrice");
        return n;
      },
    });
  }
  if (s.condition) {
    chips.push({
      key: "condition",
      label: `Condition: ${CONDITION_LABELS[s.condition] ?? s.condition}`,
      clear: () => {
        const n = new URLSearchParams(sp.toString());
        n.delete("condition");
        return n;
      },
    });
  }
  if (s.degreeMin) {
    chips.push({
      key: "degreeMin",
      label: `Loft: ${s.degreeMin}°+`,
      clear: () => {
        const n = new URLSearchParams(sp.toString());
        n.delete("degreeMin");
        return n;
      },
    });
  } else if (s.degree) {
    const degDisplay = s.degree.replace(/°\s*$/, "").trim();
    chips.push({
      key: "degree",
      label: `Loft: ${degDisplay}°`,
      clear: () => {
        const n = new URLSearchParams(sp.toString());
        n.delete("degree");
        return n;
      },
    });
  }
  if (s.shaftFlex) {
    chips.push({
      key: "shaftFlex",
      label: `Flex: ${s.shaftFlex}`,
      clear: () => {
        const n = new URLSearchParams(sp.toString());
        n.delete("shaftFlex");
        return n;
      },
    });
  }
  if (s.handed) {
    chips.push({
      key: "handed",
      label: `Hand: ${s.handed === "left" ? "Left" : "Right"}`,
      clear: () => {
        const n = new URLSearchParams(sp.toString());
        n.delete("handed");
        return n;
      },
    });
  }
  if (s.shaft) {
    chips.push({
      key: "shaft",
      label: `Shaft: ${s.shaft}`,
      clear: () => {
        const n = new URLSearchParams(sp.toString());
        n.delete("shaft");
        return n;
      },
    });
  }
  if (s.search) {
    chips.push({
      key: "search",
      label: `Search: ${s.search.length > 20 ? `${s.search.slice(0, 20)}…` : s.search}`,
      clear: () => {
        const n = new URLSearchParams(sp.toString());
        n.delete("search");
        return n;
      },
    });
  }
  if (s.item_type) {
    chips.push({
      key: "item_type",
      label: `Type: ${s.item_type}`,
      clear: () => {
        const n = new URLSearchParams(sp.toString());
        n.delete("item_type");
        return n;
      },
    });
  }
  if (s.size) {
    chips.push({
      key: "size",
      label: `Size: ${s.size}`,
      clear: () => {
        const n = new URLSearchParams(sp.toString());
        n.delete("size");
        return n;
      },
    });
  }
  if (s.sort && s.sort !== "newest") {
    chips.push({
      key: "sort",
      label: SORT_LABELS[s.sort] ?? s.sort,
      clear: () => {
        const n = new URLSearchParams(sp.toString());
        n.delete("sort");
        return n;
      },
    });
  }

  if (chips.length === 0) return null;

  const clearAll = () => {
    router.push("/");
  };

  return (
    <div className="mb-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => {
              const n = c.clear();
              const q = n.toString();
              router.push(q ? `/?${q}` : "/");
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-mowing-green/30 bg-mowing-green/5 px-3 py-1.5 text-sm text-mowing-green hover:bg-mowing-green/10"
          >
            <span>{c.label}</span>
            <X className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          </button>
        ))}
        <button
          type="button"
          onClick={clearAll}
          className="text-xs font-medium text-par-3-punch hover:underline px-2 py-1"
        >
          Clear all
        </button>
      </div>
    </div>
  );
}
