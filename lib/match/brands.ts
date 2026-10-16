import type { ReadonlyHeadRecord } from "./intelligence/load";

export type BrandRegistryEntry = {
  /** Stable canonical ID used in marketplace_preferences.brand_ids */
  id: string;
  /** Display label from frozen intelligence (first seen spelling). */
  label: string;
};

export type BrandRegistry = {
  readonly entries: ReadonlyArray<BrandRegistryEntry>;
  readonly ids: ReadonlySet<string>;
  readonly byId: Readonly<Record<string, BrandRegistryEntry>>;
};

/**
 * Canonical head-brand ID from a frozen brand string.
 * Lowercase alphanumeric only — stable across casing/spacing variants.
 */
export function canonicalBrandId(brand: string | null | undefined): string | null {
  if (brand == null) return null;
  const id = String(brand)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  return id || null;
}

/**
 * Build registry from the full frozen head universe (not only Match-eligible).
 * Brands with no current inventory remain valid selection IDs.
 */
export function buildBrandRegistry(
  heads: ReadonlyArray<ReadonlyHeadRecord>
): BrandRegistry {
  const byId: Record<string, BrandRegistryEntry> = {};
  for (const h of heads) {
    const raw = h.brand ?? h.Brand;
    if (typeof raw !== "string" || !raw.trim()) continue;
    const id = canonicalBrandId(raw);
    if (!id) continue;
    if (!byId[id]) {
      byId[id] = Object.freeze({ id, label: raw.trim() });
    }
  }
  const entries = Object.freeze(
    Object.values(byId).sort((a, b) =>
      a.label.localeCompare(b.label, "en", { sensitivity: "base" })
    )
  );
  return Object.freeze({
    entries,
    ids: freezeStringSet(entries.map((e) => e.id)),
    byId: Object.freeze(byId),
  });
}

/** Object.freeze alone does not block Set.add/delete/clear — seal mutators first. */
function freezeStringSet(values: ReadonlyArray<string>): ReadonlySet<string> {
  const ids = new Set(values);
  for (const key of ["add", "delete", "clear"] as const) {
    Object.defineProperty(ids, key, {
      configurable: false,
      enumerable: false,
      writable: false,
      value() {
        throw new TypeError("Cannot mutate frozen brand registry ids");
      },
    });
  }
  return Object.freeze(ids);
}

export type BrandSelectionResult =
  | {
      ok: true;
      /** Missing or [] → all brands; otherwise deduped sorted valid IDs. */
      brand_ids: string[];
      scope: "ALL_BRANDS" | "SELECTED_BRANDS";
    }
  | { ok: false; error: "INVALID_BRAND_SELECTION"; invalid_ids: string[] };

/**
 * Validate marketplace brand_ids against the frozen registry.
 * - null / undefined / [] → all brands (ok)
 * - unknown IDs → INVALID_BRAND_SELECTION (must not silently broaden)
 * - duplicates are normalized away
 */
export function validateBrandSelection(
  selected: string[] | null | undefined,
  registry: BrandRegistry
): BrandSelectionResult {
  if (selected == null || selected.length === 0) {
    return { ok: true, brand_ids: [], scope: "ALL_BRANDS" };
  }
  const invalid: string[] = [];
  const valid = new Set<string>();
  for (const raw of selected) {
    const id = String(raw);
    if (!registry.ids.has(id)) invalid.push(id);
    else valid.add(id);
  }
  if (invalid.length > 0) {
    return {
      ok: false,
      error: "INVALID_BRAND_SELECTION",
      invalid_ids: Array.from(new Set(invalid)).sort(),
    };
  }
  return {
    ok: true,
    brand_ids: Array.from(valid).sort(),
    scope: "SELECTED_BRANDS",
  };
}
