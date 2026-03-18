/**
 * Canonical brand labels for filter suggestions and URL params.
 * Safe to import from client or server.
 */

const STRIP_GOLF_TO_BASE = new Map<string, string>([
  ["nike golf", "Nike"],
  ["adidas golf", "Adidas"],
  ["puma golf", "Puma"],
  ["under armour golf", "Under Armour"],
]);

/**
 * Normalize free-typed or catalogue brand strings for deduped suggestions
 * and consistent `brand` query values.
 */
export function canonicalFilterBrand(raw: string): string {
  const s = raw.trim();
  if (!s) return s;

  const lower = s.toLowerCase();
  const stripBase = STRIP_GOLF_TO_BASE.get(lower);
  if (stripBase) return stripBase;

  const jNorm = lower.replace(/\./g, " ").replace(/\s+/g, " ").trim();
  if (jNorm === "j lindeberg") return "J.Lindeberg";

  if (lower === "rlx") return "RLX Ralph Lauren";
  if (lower === "rlx ralph lauren") return "RLX Ralph Lauren";

  return s;
}

/**
 * Substrings to OR-match on `listings.brand` (ilike %term%) after canonicalization.
 * Covers DB values that differ from the canonical filter label.
 */
export function brandFilterIlikeTerms(input: string): string[] {
  const c = canonicalFilterBrand(input.trim());
  if (!c) return [];
  if (c === "J.Lindeberg") return ["J.Lindeberg", "J Lindeberg"];
  if (c === "RLX Ralph Lauren") return ["RLX Ralph Lauren", "RLX"];
  return [c];
}
