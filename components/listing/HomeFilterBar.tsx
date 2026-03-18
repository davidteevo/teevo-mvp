"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { SlidersHorizontal } from "lucide-react";
import clsx from "clsx";
import { canonicalFilterBrand } from "@/lib/brand-canonical";
import {
  emptyHomeFilterState,
  homeStateToSearchParams,
  searchParamsToHomeState,
  type HomeFilterState,
} from "@/lib/home-filter-url";
import { FilterChip } from "./FilterChip";
import { FilterDrawer } from "./FilterDrawer";

type SheetId = "filters" | "brand" | "price" | "specs" | "sort" | null;

const CATEGORIES: { value: string; label: string }[] = [
  { value: "Driver", label: "Driver" },
  { value: "Woods", label: "Fairway woods" },
  { value: "Driving Irons", label: "Driving irons" },
  { value: "Hybrids", label: "Hybrids" },
  { value: "Irons", label: "Irons" },
  { value: "Wedges", label: "Wedges" },
  { value: "Putter", label: "Putters" },
  { value: "Bag", label: "Bags" },
  { value: "Clothing", label: "Clothing" },
  { value: "Accessories", label: "Accessories" },
];

const CONDITIONS: { value: string; label: string }[] = [
  { value: "New", label: "New" },
  { value: "Excellent", label: "Excellent" },
  { value: "Good", label: "Good" },
  { value: "Fair", label: "Fair" },
  { value: "Used", label: "Used" },
];

type LoftOpt =
  | { kind: "exact"; value: number; label: string }
  | { kind: "min"; value: number; label: string };

function loftKey(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n);
}

/** Exact lofts sorted ascending; min chip last. */
const LOFT_BY_CATEGORY: Record<string, LoftOpt[]> = {
  Driver: [
    { kind: "exact", value: 8, label: "8°" },
    { kind: "exact", value: 9, label: "9°" },
    { kind: "exact", value: 10.5, label: "10.5°" },
    { kind: "exact", value: 11, label: "11°" },
    { kind: "exact", value: 12, label: "12°" },
    { kind: "min", value: 13, label: "13°+" },
  ],
  Wedges: [
    { kind: "exact", value: 46, label: "46°" },
    { kind: "exact", value: 48, label: "48°" },
    { kind: "exact", value: 50, label: "50°" },
    { kind: "exact", value: 52, label: "52°" },
    { kind: "exact", value: 54, label: "54°" },
    { kind: "exact", value: 56, label: "56°" },
    { kind: "exact", value: 58, label: "58°" },
    { kind: "exact", value: 60, label: "60°" },
    { kind: "min", value: 62, label: "62°+" },
  ],
  Woods: [
    { kind: "exact", value: 13.5, label: "13.5° (Strong 3 Wood)" },
    { kind: "exact", value: 15, label: "15° (3 Wood)" },
    { kind: "exact", value: 16.5, label: "16.5° (4 Wood)" },
    { kind: "exact", value: 17, label: "17°" },
    { kind: "exact", value: 18, label: "18° (5 Wood)" },
    { kind: "exact", value: 19, label: "19°" },
    { kind: "exact", value: 21, label: "21° (7 Wood)" },
    { kind: "exact", value: 24, label: "24° (9 Wood)" },
    { kind: "min", value: 25, label: "25°+" },
  ],
  Hybrids: [
    { kind: "exact", value: 19, label: "19° (3H)" },
    { kind: "exact", value: 22, label: "22° (4H)" },
    { kind: "exact", value: 25, label: "25° (5H)" },
    { kind: "exact", value: 28, label: "28° (6H)" },
  ],
  "Driving Irons": [
    { kind: "exact", value: 16, label: "16°" },
    { kind: "exact", value: 17, label: "17°" },
    { kind: "exact", value: 18, label: "18° (2 Iron)" },
    { kind: "exact", value: 19, label: "19°" },
    { kind: "exact", value: 20, label: "20° (3 Iron)" },
    { kind: "exact", value: 21, label: "21°" },
    { kind: "exact", value: 22, label: "22°" },
    { kind: "exact", value: 23, label: "23° (4 Iron)" },
    { kind: "exact", value: 24, label: "24°" },
    { kind: "min", value: 25, label: "25°+" },
  ],
};

function isExactLoftForCategory(category: string, degree: string): boolean {
  const opts = LOFT_BY_CATEGORY[category];
  if (!opts) return false;
  const t = degree.trim();
  return opts.some((o) => o.kind === "exact" && loftKey(o.value) === t);
}

function LoftFilterSection({
  draft,
  setDraft,
  loftOtherUi,
  setLoftOtherUi,
}: {
  draft: HomeFilterState;
  setDraft: Dispatch<SetStateAction<HomeFilterState>>;
  loftOtherUi: boolean;
  setLoftOtherUi: (v: boolean) => void;
}) {
  const cat = draft.category;
  const opts = cat ? LOFT_BY_CATEGORY[cat] : undefined;

  const customActive =
    !!draft.degree.trim() &&
    !draft.degreeMin &&
    (!opts || !isExactLoftForCategory(cat, draft.degree));
  const otherOpen = loftOtherUi || customActive;

  const exactSelected = (n: number) =>
    !draft.degreeMin && draft.degree.trim() === loftKey(n);
  const minSelected = (n: number) => draft.degreeMin === String(n);

  if (!opts) {
    return (
      <>
        <p className="mb-3 text-sm text-mowing-green/75">
          Choose <strong>Driver</strong>, <strong>Fairway woods</strong>, <strong>Wedges</strong>,{" "}
          <strong>Hybrids</strong>, or <strong>Driving irons</strong> above for loft presets, or use Other.
        </p>
        <div className="flex flex-wrap gap-2">
          <FilterChip
            selected={otherOpen}
            onClick={() => {
              if (otherOpen) {
                setDraft((d) => ({ ...d, degree: "", degreeMin: "" }));
                setLoftOtherUi(false);
              } else {
                setLoftOtherUi(true);
                setDraft((d) => ({ ...d, degree: "", degreeMin: "" }));
              }
            }}
          >
            Other
          </FilterChip>
        </div>
        {otherOpen ? (
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-mowing-green/70">
              Custom loft (degrees)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={draft.degree}
              onChange={(e) => {
                const v = e.target.value.replace(/°/g, "").trim();
                setDraft((d) => ({ ...d, degree: v, degreeMin: "" }));
              }}
              placeholder="e.g. 10.25"
              className="w-full rounded-xl border border-mowing-green/25 px-3 py-2.5 text-sm text-mowing-green placeholder:text-mowing-green/45"
            />
          </div>
        ) : null}
      </>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {opts.map((opt, i) => {
          const key = opt.kind === "exact" ? `e-${opt.value}-${i}` : `m-${opt.value}`;
          if (opt.kind === "exact") {
            return (
              <FilterChip
                key={key}
                selected={exactSelected(opt.value)}
                onClick={() => {
                  setLoftOtherUi(false);
                  const k = loftKey(opt.value);
                  setDraft((d) => ({
                    ...d,
                    degreeMin: "",
                    degree: d.degree.trim() === k ? "" : k,
                  }));
                }}
              >
                {opt.label}
              </FilterChip>
            );
          }
          return (
            <FilterChip
              key={key}
              selected={minSelected(opt.value)}
              onClick={() => {
                setLoftOtherUi(false);
                const s = String(opt.value);
                setDraft((d) => ({
                  ...d,
                  degree: "",
                  degreeMin: d.degreeMin === s ? "" : s,
                }));
              }}
            >
              {opt.label}
            </FilterChip>
          );
        })}
        <FilterChip
          selected={otherOpen}
          onClick={() => {
            if (otherOpen) {
              setDraft((d) => ({ ...d, degree: "", degreeMin: "" }));
              setLoftOtherUi(false);
            } else {
              setLoftOtherUi(true);
              setDraft((d) => ({ ...d, degree: "", degreeMin: "" }));
            }
          }}
        >
          Other
        </FilterChip>
      </div>
      {otherOpen ? (
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-mowing-green/70">
            Custom loft (degrees)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={draft.degree}
            onChange={(e) => {
              const v = e.target.value.replace(/°/g, "").trim();
              setDraft((d) => ({ ...d, degree: v, degreeMin: "" }));
              if (opts.some((o) => o.kind === "exact" && loftKey(o.value) === v)) {
                setLoftOtherUi(false);
              }
            }}
            placeholder="e.g. 10.25"
            className="w-full rounded-xl border border-mowing-green/25 px-3 py-2.5 text-sm text-mowing-green placeholder:text-mowing-green/45"
          />
        </div>
      ) : null}
    </>
  );
}
const FLEX_OPTS = ["Senior", "Regular", "Stiff", "X-Stiff", "Other"];
const SORT_OPTS: { value: string; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low → high" },
  { value: "price_desc", label: "Price: high → low" },
];

const PRICE_MAX_SLIDER = 500;

function applyDraft(router: ReturnType<typeof useRouter>, draft: HomeFilterState) {
  const d = { ...draft, brand: draft.brand ? canonicalFilterBrand(draft.brand) : "" };
  const p = homeStateToSearchParams(d);
  const q = p.toString();
  router.push(q ? `/?${q}` : "/");
}

export function HomeFilterBar({ brandSuggestions }: { brandSuggestions: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sheet, setSheet] = useState<SheetId>(null);
  const [draft, setDraft] = useState<HomeFilterState>(emptyHomeFilterState);
  const [brandQuery, setBrandQuery] = useState("");
  const [specsAdvanced, setSpecsAdvanced] = useState(false);
  const [resultCount, setResultCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const [loftOtherUi, setLoftOtherUi] = useState(false);

  const openSheet = useCallback(
    (id: Exclude<SheetId, null>) => {
      const next = searchParamsToHomeState(new URLSearchParams(searchParams.toString()));
      setDraft(next);
      setLoftOtherUi(
        Boolean(
          next.degree &&
            !next.degreeMin &&
            (!next.category ||
              !LOFT_BY_CATEGORY[next.category] ||
              !isExactLoftForCategory(next.category, next.degree))
        )
      );
      setBrandQuery("");
      if (id === "filters" || id === "specs") setSpecsAdvanced(false);
      setSheet(id);
    },
    [searchParams]
  );

  const filteredBrands = useMemo(() => {
    const q = brandQuery.trim().toLowerCase();
    if (!q) return brandSuggestions;
    return brandSuggestions.filter((b) => b.toLowerCase().includes(q));
  }, [brandSuggestions, brandQuery]);

  useEffect(() => {
    if (!sheet || sheet === "sort") {
      setResultCount(null);
      return;
    }
    setCountLoading(true);
    const t = setTimeout(() => {
      const p = homeStateToSearchParams({
        ...draft,
        brand: draft.brand ? canonicalFilterBrand(draft.brand) : "",
      }).toString();
      fetch(`/api/listings/count?${p}`)
        .then((r) => r.json())
        .then((d) => setResultCount(typeof d.count === "number" ? d.count : 0))
        .catch(() => setResultCount(null))
        .finally(() => setCountLoading(false));
    }, 280);
    return () => clearTimeout(t);
  }, [draft, sheet]);

  const sp = new URLSearchParams(searchParams.toString());
  const urlState = searchParamsToHomeState(sp);

  const hasBrand = !!urlState.brand;
  const hasPrice = !!urlState.minPrice || !!urlState.maxPrice;
  const hasSpecs =
    !!urlState.degree ||
    !!urlState.degreeMin ||
    !!urlState.shaftFlex ||
    !!urlState.handed ||
    !!urlState.shaft ||
    !!urlState.item_type ||
    !!urlState.size;
  const hasFilters =
    !!urlState.category ||
    hasBrand ||
    hasPrice ||
    !!urlState.condition ||
    hasSpecs ||
    !!urlState.search;
  const sortActive = urlState.sort && urlState.sort !== "newest";

  const applyFooter = (onClose?: () => void) => (
    <button
      type="button"
      disabled={countLoading && resultCount === null}
      onClick={() => {
        applyDraft(router, draft);
        onClose?.();
        setSheet(null);
      }}
      className="w-full rounded-xl bg-mowing-green py-3.5 text-center text-base font-semibold text-white hover:bg-mowing-green/90 disabled:opacity-60"
    >
      {countLoading && resultCount === null
        ? "…"
        : resultCount != null
          ? resultCount >= 60
            ? "Show 60+ matches"
            : `Show ${resultCount} ${resultCount === 1 ? "item" : "items"}`
          : "Apply filters"}
    </button>
  );

  const applySort = (sort: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (!sort || sort === "newest") next.delete("sort");
    else next.set("sort", sort);
    const q = next.toString();
    router.push(q ? `/?${q}` : "/");
    setSheet(null);
  };

  const minSlider = Math.min(
    PRICE_MAX_SLIDER,
    Math.max(0, draft.minPrice ? parseInt(draft.minPrice, 10) || 0 : 0)
  );
  const maxSlider = Math.min(
    PRICE_MAX_SLIDER,
    Math.max(
      minSlider,
      draft.maxPrice ? parseInt(draft.maxPrice, 10) || PRICE_MAX_SLIDER : PRICE_MAX_SLIDER
    )
  );

  const setPriceRange = (min: number, max: number) => {
    setDraft((d) => ({
      ...d,
      minPrice: min <= 0 ? "" : String(min),
      maxPrice: max >= PRICE_MAX_SLIDER ? "" : String(max),
    }));
  };

  const barBtn = (active: boolean) =>
    clsx(
      "shrink-0 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors min-h-[44px]",
      active
        ? "border-mowing-green bg-mowing-green text-white"
        : "border-mowing-green/35 bg-white text-mowing-green hover:border-mowing-green/55"
    );

  return (
    <>
      <div className="sticky top-0 z-40 mb-4 w-full min-w-0 max-w-full border-b border-mowing-green/10 bg-[#fafaf8]/95 py-3 backdrop-blur-sm supports-[backdrop-filter]:bg-[#fafaf8]/85">
        <div className="flex w-full min-w-0 max-w-full gap-2 overflow-x-auto overflow-y-hidden pb-1 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            className={barBtn(!!hasFilters)}
            onClick={() => openSheet("filters")}
          >
            <span className="flex items-center gap-1.5">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </span>
          </button>
          <button type="button" className={barBtn(hasBrand)} onClick={() => openSheet("brand")}>
            Brand
          </button>
          <button type="button" className={barBtn(hasPrice)} onClick={() => openSheet("price")}>
            Price
          </button>
          <button type="button" className={barBtn(hasSpecs)} onClick={() => openSheet("specs")}>
            Specs
          </button>
          <button type="button" className={barBtn(!!sortActive)} onClick={() => openSheet("sort")}>
            Sort
          </button>
        </div>
      </div>

      {/* All filters */}
      <FilterDrawer
        open={sheet === "filters"}
        onOpenChange={(o) => !o && setSheet(null)}
        title="Filters"
        footer={applyFooter()}
      >
        <section className="mb-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-mowing-green/60">
            Category
          </h3>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(({ value, label }) => (
              <FilterChip
                key={value}
                selected={draft.category === value}
                onClick={() => {
                  setDraft((d) => {
                    const nextCat = d.category === value ? "" : value;
                    const changed = nextCat !== d.category;
                    return {
                      ...d,
                      category: nextCat,
                      ...(changed ? { degree: "", degreeMin: "" } : {}),
                    };
                  });
                  setLoftOtherUi(false);
                }}
              >
                {label}
              </FilterChip>
            ))}
          </div>
        </section>
        <section className="mb-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-mowing-green/60">
            Condition
          </h3>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map(({ value, label }) => (
              <FilterChip
                key={value}
                selected={draft.condition === value}
                onClick={() =>
                  setDraft((d) => ({ ...d, condition: d.condition === value ? "" : value }))
                }
              >
                {label}
              </FilterChip>
            ))}
          </div>
        </section>
        <section className="mb-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-mowing-green/60">
            Brand
          </h3>
          <input
            type="search"
            value={draft.brand}
            onChange={(e) => setDraft((d) => ({ ...d, brand: e.target.value }))}
            placeholder="Search brands…"
            className="mb-2 w-full rounded-xl border border-mowing-green/25 px-3 py-2.5 text-sm"
          />
          <div className="max-h-40 overflow-y-auto rounded-xl border border-mowing-green/15">
            {brandSuggestions
              .filter((b) => !draft.brand || b.toLowerCase().includes(draft.brand.toLowerCase()))
              .slice(0, 80)
              .map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, brand: b }))}
                  className={clsx(
                    "block w-full px-3 py-2.5 text-left text-sm hover:bg-mowing-green/5",
                    draft.brand === b && "bg-mowing-green/10 font-medium"
                  )}
                >
                  {b}
                </button>
              ))}
          </div>
        </section>
        <section className="mb-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-mowing-green/60">
            Price
          </h3>
          <div className="mb-4 flex flex-wrap gap-2">
            <FilterChip
              selected={draft.maxPrice === "100" && !draft.minPrice}
              onClick={() => setDraft((d) => ({ ...d, minPrice: "", maxPrice: "100" }))}
            >
              Under £100
            </FilterChip>
            <FilterChip
              selected={draft.minPrice === "100" && draft.maxPrice === "250"}
              onClick={() => setDraft((d) => ({ ...d, minPrice: "100", maxPrice: "250" }))}
            >
              £100–£250
            </FilterChip>
            <FilterChip
              selected={draft.minPrice === "250" && !draft.maxPrice}
              onClick={() => setDraft((d) => ({ ...d, minPrice: "250", maxPrice: "" }))}
            >
              £250+
            </FilterChip>
            <FilterChip
              selected={!draft.minPrice && !draft.maxPrice}
              onClick={() => setDraft((d) => ({ ...d, minPrice: "", maxPrice: "" }))}
            >
              Any
            </FilterChip>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-xs text-mowing-green/70">
              <span>Min £{minSlider}</span>
              <span>Max {maxSlider >= PRICE_MAX_SLIDER ? "£500+" : `£${maxSlider}`}</span>
            </div>
            <label className="block text-xs text-mowing-green/60">Minimum</label>
            <input
              type="range"
              min={0}
              max={PRICE_MAX_SLIDER}
              step={25}
              value={minSlider}
              onChange={(e) => {
                const v = +e.target.value;
                setPriceRange(v, Math.max(v, maxSlider));
              }}
              className="w-full accent-mowing-green"
            />
            <label className="block text-xs text-mowing-green/60">Maximum</label>
            <input
              type="range"
              min={0}
              max={PRICE_MAX_SLIDER}
              step={25}
              value={maxSlider}
              onChange={(e) => {
                const v = +e.target.value;
                setPriceRange(Math.min(v, minSlider), v);
              }}
              className="w-full accent-mowing-green"
            />
          </div>
        </section>
        <section className="mb-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-mowing-green/60">
            Loft
          </h3>
          <LoftFilterSection
            draft={draft}
            setDraft={setDraft}
            loftOtherUi={loftOtherUi}
            setLoftOtherUi={setLoftOtherUi}
          />
        </section>
        <section className="mb-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-mowing-green/60">
            Shaft flex
          </h3>
          <div className="flex flex-wrap gap-2">
            {FLEX_OPTS.map((f) => (
              <FilterChip
                key={f}
                selected={draft.shaftFlex === f}
                onClick={() =>
                  setDraft((d) => ({ ...d, shaftFlex: d.shaftFlex === f ? "" : f }))
                }
              >
                {f}
              </FilterChip>
            ))}
          </div>
        </section>
        <section className="mb-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-mowing-green/60">
            Handed
          </h3>
          <div className="flex flex-wrap gap-2">
            <FilterChip
              selected={draft.handed === "right"}
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  handed: d.handed === "right" ? "" : "right",
                }))
              }
            >
              Right
            </FilterChip>
            <FilterChip
              selected={draft.handed === "left"}
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  handed: d.handed === "left" ? "" : "left",
                }))
              }
            >
              Left
            </FilterChip>
          </div>
        </section>
        <button
          type="button"
          onClick={() => setSpecsAdvanced((x) => !x)}
          className="mb-3 text-sm font-medium text-mowing-green underline"
        >
          {specsAdvanced ? "Hide" : "More"} (shaft, search, size…)
        </button>
        {specsAdvanced && (
          <div className="mb-6 space-y-4">
            <div>
              <label className="mb-1 block text-xs text-mowing-green/60">Shaft model</label>
              <input
                value={draft.shaft}
                onChange={(e) => setDraft((d) => ({ ...d, shaft: e.target.value }))}
                className="w-full rounded-xl border border-mowing-green/25 px-3 py-2 text-sm"
                placeholder="e.g. Ventus"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-mowing-green/60">Search</label>
              <input
                value={draft.search}
                onChange={(e) => setDraft((d) => ({ ...d, search: e.target.value }))}
                className="w-full rounded-xl border border-mowing-green/25 px-3 py-2 text-sm"
                placeholder="Keywords…"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-mowing-green/60">Item type</label>
              <input
                value={draft.item_type}
                onChange={(e) => setDraft((d) => ({ ...d, item_type: e.target.value }))}
                className="w-full rounded-xl border border-mowing-green/25 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-mowing-green/60">Size</label>
              <input
                value={draft.size}
                onChange={(e) => setDraft((d) => ({ ...d, size: e.target.value }))}
                className="w-full rounded-xl border border-mowing-green/25 px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}
      </FilterDrawer>

      {/* Brand only */}
      <FilterDrawer
        open={sheet === "brand"}
        onOpenChange={(o) => !o && setSheet(null)}
        title="Brand"
        footer={applyFooter()}
      >
        <input
          type="search"
          value={brandQuery}
          onChange={(e) => setBrandQuery(e.target.value)}
          placeholder="Type to filter…"
          className="mb-3 w-full rounded-xl border border-mowing-green/25 px-3 py-2.5 text-sm"
          autoFocus
        />
        <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-mowing-green/15">
          {filteredBrands.slice(0, 120).map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => {
                setDraft((d) => ({ ...d, brand: b }));
              }}
              className={clsx(
                "block w-full px-3 py-3 text-left text-sm hover:bg-mowing-green/5",
                draft.brand === b && "bg-mowing-green/10 font-semibold"
              )}
            >
              {b}
            </button>
          ))}
        </div>
      </FilterDrawer>

      {/* Price only */}
      <FilterDrawer
        open={sheet === "price"}
        onOpenChange={(o) => !o && setSheet(null)}
        title="Price"
        footer={applyFooter()}
      >
        <div className="mb-6 flex flex-wrap gap-2">
          <FilterChip
            selected={draft.maxPrice === "100" && !draft.minPrice}
            onClick={() => setDraft((d) => ({ ...d, minPrice: "", maxPrice: "100" }))}
          >
            Under £100
          </FilterChip>
          <FilterChip
            selected={draft.minPrice === "100" && draft.maxPrice === "250"}
            onClick={() => setDraft((d) => ({ ...d, minPrice: "100", maxPrice: "250" }))}
          >
            £100–£250
          </FilterChip>
          <FilterChip
            selected={draft.minPrice === "250" && !draft.maxPrice}
            onClick={() => setDraft((d) => ({ ...d, minPrice: "250", maxPrice: "" }))}
          >
            £250+
          </FilterChip>
          <FilterChip
            selected={!draft.minPrice && !draft.maxPrice}
            onClick={() => setDraft((d) => ({ ...d, minPrice: "", maxPrice: "" }))}
          >
            Any price
          </FilterChip>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between text-sm text-mowing-green/80">
            <span>£{minSlider}</span>
            <span>{maxSlider >= PRICE_MAX_SLIDER ? "£500+" : `£${maxSlider}`}</span>
          </div>
          <input
            type="range"
            min={0}
            max={PRICE_MAX_SLIDER}
            step={25}
            value={minSlider}
            onChange={(e) => {
              const v = +e.target.value;
              setPriceRange(v, Math.max(v, maxSlider));
            }}
            className="w-full accent-mowing-green"
          />
          <input
            type="range"
            min={0}
            max={PRICE_MAX_SLIDER}
            step={25}
            value={maxSlider}
            onChange={(e) => {
              const v = +e.target.value;
              setPriceRange(Math.min(v, minSlider), v);
            }}
            className="w-full accent-mowing-green"
          />
        </div>
      </FilterDrawer>

      {/* Specs */}
      <FilterDrawer
        open={sheet === "specs"}
        onOpenChange={(o) => !o && setSheet(null)}
        title="Specs"
        footer={applyFooter()}
      >
        <section className="mb-5">
          <h3 className="mb-2 text-xs font-semibold uppercase text-mowing-green/60">Loft</h3>
          <LoftFilterSection
            draft={draft}
            setDraft={setDraft}
            loftOtherUi={loftOtherUi}
            setLoftOtherUi={setLoftOtherUi}
          />
        </section>
        <section className="mb-5">
          <h3 className="mb-2 text-xs font-semibold uppercase text-mowing-green/60">Shaft flex</h3>
          <div className="flex flex-wrap gap-2">
            {FLEX_OPTS.map((f) => (
              <FilterChip
                key={f}
                selected={draft.shaftFlex === f}
                onClick={() =>
                  setDraft((d) => ({ ...d, shaftFlex: d.shaftFlex === f ? "" : f }))
                }
              >
                {f}
              </FilterChip>
            ))}
          </div>
        </section>
        <section className="mb-5">
          <h3 className="mb-2 text-xs font-semibold uppercase text-mowing-green/60">Handed</h3>
          <div className="flex flex-wrap gap-2">
            <FilterChip
              selected={draft.handed === "right"}
              onClick={() =>
                setDraft((d) => ({ ...d, handed: d.handed === "right" ? "" : "right" }))
              }
            >
              Right
            </FilterChip>
            <FilterChip
              selected={draft.handed === "left"}
              onClick={() =>
                setDraft((d) => ({ ...d, handed: d.handed === "left" ? "" : "left" }))
              }
            >
              Left
            </FilterChip>
          </div>
        </section>
        <button
          type="button"
          onClick={() => setSpecsAdvanced((x) => !x)}
          className="mb-3 text-sm font-medium text-mowing-green underline"
        >
          {specsAdvanced ? "Hide" : "Advanced"} (shaft, search…)
        </button>
        {specsAdvanced && (
          <div className="space-y-3">
            <input
              value={draft.shaft}
              onChange={(e) => setDraft((d) => ({ ...d, shaft: e.target.value }))}
              className="w-full rounded-xl border border-mowing-green/25 px-3 py-2 text-sm"
              placeholder="Shaft model"
            />
            <input
              value={draft.search}
              onChange={(e) => setDraft((d) => ({ ...d, search: e.target.value }))}
              className="w-full rounded-xl border border-mowing-green/25 px-3 py-2 text-sm"
              placeholder="Search keywords"
            />
            <input
              value={draft.item_type}
              onChange={(e) => setDraft((d) => ({ ...d, item_type: e.target.value }))}
              className="w-full rounded-xl border border-mowing-green/25 px-3 py-2 text-sm"
              placeholder="Item type"
            />
            <input
              value={draft.size}
              onChange={(e) => setDraft((d) => ({ ...d, size: e.target.value }))}
              className="w-full rounded-xl border border-mowing-green/25 px-3 py-2 text-sm"
              placeholder="Size"
            />
          </div>
        )}
      </FilterDrawer>

      {/* Sort — instant apply */}
      <FilterDrawer
        open={sheet === "sort"}
        onOpenChange={(o) => !o && setSheet(null)}
        title="Sort"
      >
        <div className="flex flex-col gap-2">
          {SORT_OPTS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => applySort(value)}
              className={clsx(
                "w-full rounded-xl border px-4 py-3.5 text-left text-sm font-medium",
                (searchParams.get("sort") || "newest") === value
                  ? "border-mowing-green bg-mowing-green text-white"
                  : "border-mowing-green/25 text-mowing-green hover:bg-mowing-green/5"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </FilterDrawer>
    </>
  );
}
