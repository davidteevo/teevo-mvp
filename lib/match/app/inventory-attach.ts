import type { CatalogueHeadScore } from "../catalogue-types";
import type { MatchIntelligence } from "../intelligence/load";
import { scoreCandidate } from "../scoring/candidate";
import type { InventoryListing, NormalisedRequirements } from "../types";
import type {
  CatalogueInventoryAttachment,
  MatchInventoryAttachedRow,
  MatchInventoryItem,
} from "../inventory/types";

function handednessConfirmedEqual(
  golfer: "LEFT" | "RIGHT",
  listing: "LEFT" | "RIGHT" | null
): boolean {
  return listing === golfer;
}

/**
 * Attach Teevo inventory to catalogue recommendations.
 * - UNIQUE head + confirmed matching handedness required.
 * - Ambiguous / unresolved head or unknown handedness → skip.
 * - Shaft unresolved → HEAD_ONLY + unverified_shaft (no listing Match badge).
 * - Full config + successful scoreCandidate → FULL_LISTING_MATCH badge.
 */
export function attachInventoryToCatalogueRecommendations(input: {
  recommendations: CatalogueHeadScore[];
  inventory: MatchInventoryItem[];
  requirements: NormalisedRequirements;
  intelligence: MatchIntelligence;
  golferConfidence: number;
}): CatalogueInventoryAttachment[] {
  const recommendedKeys = new Set(
    input.recommendations.map((r) => r.catalogue_key)
  );
  const byKey = new Map<string, MatchInventoryAttachedRow[]>();
  Array.from(recommendedKeys).forEach((key) => byKey.set(key, []));

  const golferHand = input.requirements.handedness;

  for (const item of input.inventory) {
    if (item.availability_status !== "AVAILABLE") continue;
    if (item.identity.head_resolution !== "UNIQUE" || !item.head_key) continue;
    if (!recommendedKeys.has(item.head_key)) continue;
    if (
      !handednessConfirmedEqual(golferHand, item.listed_config.handedness)
    ) {
      continue;
    }

    const shaftOk =
      item.identity.shaft_resolution === "UNIQUE" &&
      !!item.shaft_key &&
      item.listed_config.stated_loft_deg != null;

    if (!shaftOk) {
      byKey.get(item.head_key)!.push({
        item,
        attach_mode: "HEAD_ONLY",
        unverified_shaft: true,
        listing_match: null,
      });
      continue;
    }

    const listing: InventoryListing = {
      listing_id: item.source_listing_id,
      head_key: item.head_key,
      shaft_key: item.shaft_key,
      handedness: item.listed_config.handedness!,
      stated_loft_deg: item.listed_config.stated_loft_deg,
      publicly_purchasable: true,
      price_gbp: item.price_minor / 100,
      condition: item.condition ?? undefined,
    };

    const scored = scoreCandidate({
      listing,
      requirements: input.requirements,
      head: input.intelligence.headsByKey[item.head_key],
      shaft: input.intelligence.shaftsByKey[item.shaft_key!],
      golferConfidence: input.golferConfidence,
    });

    if (
      scored.excluded ||
      !scored.scorable ||
      scored.raw_fit_score == null ||
      !scored.match_band ||
      !scored.confidence ||
      scored.suppressed
    ) {
      // Config present but Phase 1 scoring did not produce a badge — still show
      // as head-only availability without claiming a Match badge.
      byKey.get(item.head_key)!.push({
        item,
        attach_mode: "HEAD_ONLY",
        unverified_shaft: false,
        listing_match: null,
      });
      continue;
    }

    byKey.get(item.head_key)!.push({
      item,
      attach_mode: "FULL_LISTING_MATCH",
      unverified_shaft: false,
      listing_match: {
        listing_id: scored.listing_id,
        match_band: scored.match_band,
        confidence: scored.confidence,
        raw_fit_score: scored.raw_fit_score,
      },
    });
  }

  // Deterministic order: FULL first, then price ascending, then listing id.
  for (const [, rows] of Array.from(byKey.entries())) {
    rows.sort((a, b) => {
      const mode =
        (a.attach_mode === "FULL_LISTING_MATCH" ? 0 : 1) -
        (b.attach_mode === "FULL_LISTING_MATCH" ? 0 : 1);
      if (mode !== 0) return mode;
      const price = a.item.price_minor - b.item.price_minor;
      if (price !== 0) return price;
      return a.item.source_listing_id.localeCompare(b.item.source_listing_id);
    });
  }

  return input.recommendations.map((r) => ({
    catalogue_key: r.catalogue_key,
    items: byKey.get(r.catalogue_key) ?? [],
  }));
}
