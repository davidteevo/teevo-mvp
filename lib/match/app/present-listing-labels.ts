import { mergeLabels, selectMarketplaceSlots } from "../marketplace";
import type { MatchInventoryAttachedRow } from "../inventory/types";
import type { Band, ConfidenceBand, MarketplaceCandidate } from "../types";

const BANDS = new Set<Band>([
  "DO_NOT_ACTIVELY_RECOMMEND",
  "GOOD_MATCH",
  "VERY_GOOD_MATCH",
  "EXCELLENT_MATCH",
]);

export const LISTING_ROLE_LABEL = {
  BEST_MATCH: "Best match",
  BEST_VALUE: "Best value",
  BUDGET_OPTION: "Budget option",
} as const;

export type ListingRoleCode = keyof typeof LISTING_ROLE_LABEL;

/**
 * Commercial labels for listings that already passed full listing match.
 * Head-only and unresolved-shaft rows are excluded. Prices come from the
 * listing. Missing budget leaves the existing marketplace rule unchanged.
 */
export function presentAttachedListingLabels(
  rows: MatchInventoryAttachedRow[],
  budgetGbp: number | null
): Map<string, ListingRoleCode[]> {
  const candidates: MarketplaceCandidate[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    if (row.attach_mode !== "FULL_LISTING_MATCH" || !row.listing_match) continue;
    if (row.unverified_shaft) continue;
    const id = row.item.source_listing_id;
    if (!id || seen.has(id)) continue;
    const band = row.listing_match.match_band;
    const confidence = row.listing_match.confidence;
    if (!BANDS.has(band as Band)) continue;
    if (confidence !== "HIGH" && confidence !== "MEDIUM") continue;
    if (!Number.isFinite(row.item.price_minor)) continue;
    if (!Number.isFinite(row.listing_match.raw_fit_score)) continue;
    seen.add(id);
    candidates.push({
      listing_id: id,
      score: row.listing_match.raw_fit_score,
      price_gbp: row.item.price_minor / 100,
      band: band as Band,
      confidence: confidence as ConfidenceBand,
      suppressed: false,
    });
  }

  const labels = new Map<string, ListingRoleCode[]>();
  if (candidates.length === 0) return labels;

  const { slots } = selectMarketplaceSlots(candidates, budgetGbp);
  for (const card of mergeLabels(slots).cards) {
    labels.set(card.listing_id, card.labels as ListingRoleCode[]);
  }
  return labels;
}
