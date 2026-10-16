import {
  canonicalHeadBrandId,
  type MatchIntelligence,
} from "./intelligence/load";
import { validateBrandSelection } from "./brands";
import {
  brandMarketplace,
  mergeLabels,
  type MarketplaceSlots,
} from "./marketplace";
import {
  golferEvidenceConfidence,
  normalizeRequirements,
} from "./requirements";
import { scoreCandidate } from "./scoring/candidate";
import type {
  CandidateScore,
  InventoryListing,
  MarketplaceCandidate,
  MarketplacePreferences,
  NormalisedRequirements,
  RawGolferInputs,
} from "./types";
import { sortedSetValues } from "./util";
import {
  MATCH_MARKETPLACE_BRAND_FILTER_VERSION,
  matchAdapterVersions,
} from "./versions";

export type MatchSessionResult = {
  normalised_requirements: NormalisedRequirements;
  candidates: CandidateScore[];
  presentation: {
    cards: Array<{ listing_id: string; labels: string[] }>;
    empty_state: boolean;
    unfilled_slots: string[];
    scope?: "ALL_BRANDS" | "SELECTED_BRANDS";
    state?: string;
    show_all_brands_action?: boolean;
  };
  marketplace_preferences: {
    brand_ids: string[];
    policy_version: typeof MATCH_MARKETPLACE_BRAND_FILTER_VERSION;
  };
  /** Present only when brand_ids fail registry validation. */
  error?: "INVALID_BRAND_SELECTION";
  versions: ReturnType<typeof matchAdapterVersions>;
};

const EMPTY_SLOTS: MarketplaceSlots = {
  BEST_MATCH: null,
  BEST_VALUE: null,
  BUDGET_OPTION: null,
};

export function runMatchSession(input: {
  raw_inputs: RawGolferInputs;
  inventory: InventoryListing[];
  intelligence: MatchIntelligence;
  /** Outside normalised golfer requirements; strict marketplace filter only. */
  marketplace_preferences?: MarketplacePreferences;
}): MatchSessionResult {
  const req = normalizeRequirements(
    input.raw_inputs,
    input.intelligence.headsByKey
  );
  const golfer = golferEvidenceConfidence(input.raw_inputs, req.conflict_flags);

  const sessionConsiderations: string[] = [];
  const speed = input.raw_inputs.club_speed_mph;
  const carry = input.raw_inputs.carry_distance_yards;
  const hasSpeed =
    speed != null && speed !== "" && Number.isFinite(Number(speed));
  const hasCarry =
    carry != null && carry !== "" && Number.isFinite(Number(carry));
  if (!hasSpeed && hasCarry) {
    sessionConsiderations.push("SWING_SPEED_INFERRED_FROM_CARRY");
  }
  if (!hasSpeed && !hasCarry) {
    sessionConsiderations.push("SWING_SPEED_UNKNOWN");
  }

  // Fit/confidence are computed on the full inventory before brand filtering.
  const candidates = input.inventory.map((listing) => {
    const scored = scoreCandidate({
      listing,
      requirements: req,
      head: input.intelligence.headsByKey[listing.head_key],
      shaft: listing.shaft_key
        ? input.intelligence.shaftsByKey[listing.shaft_key]
        : undefined,
      golferConfidence: golfer,
    });
    if (!scored.excluded) {
      const merged = new Set([
        ...(scored.considerations || []),
        ...sessionConsiderations,
      ]);
      scored.considerations = sortedSetValues(merged);
    }
    return scored;
  });

  const market: MarketplaceCandidate[] = [];
  for (const c of candidates) {
    if (c.excluded || c.raw_fit_score == null || !c.match_band || !c.confidence) {
      continue;
    }
    const listing = input.inventory.find((l) => l.listing_id === c.listing_id)!;
    const head = input.intelligence.headsByKey[listing.head_key];
    market.push({
      listing_id: c.listing_id,
      score: c.raw_fit_score,
      price_gbp: listing.price_gbp,
      band: c.match_band,
      confidence: c.confidence,
      confidence_score: c.confidence_score ?? undefined,
      suppressed: !!c.suppressed,
      publicly_purchasable: listing.publicly_purchasable,
      head_brand_id: canonicalHeadBrandId(head),
    });
  }

  const budget =
    input.raw_inputs.budget_max_gbp == null
      ? null
      : Number(input.raw_inputs.budget_max_gbp);
  const budgetNum = Number.isFinite(budget as number) ? (budget as number) : null;

  const registry = input.intelligence.brandRegistry;
  const selection = validateBrandSelection(
    input.marketplace_preferences?.brand_ids,
    registry
  );

  // Invalid brand IDs must not silently broaden to all-brand recommendations.
  if (!selection.ok) {
    const merged = mergeLabels(EMPTY_SLOTS);
    return {
      normalised_requirements: req,
      candidates,
      presentation: {
        cards: [],
        empty_state: true,
        unfilled_slots: merged.unfilled_slots,
        scope: "SELECTED_BRANDS",
        state: "INVALID_BRAND_SELECTION",
        show_all_brands_action: true,
      },
      marketplace_preferences: {
        brand_ids: [],
        policy_version: MATCH_MARKETPLACE_BRAND_FILTER_VERSION,
      },
      error: "INVALID_BRAND_SELECTION",
      versions: matchAdapterVersions(),
    };
  }

  const brandResult = brandMarketplace({
    selected_brand_ids: selection.brand_ids,
    known_brand_ids: Array.from(registry.ids),
    candidates: market,
    budget: budgetNum,
  });

  if ("error" in brandResult) {
    // Defensive: validateBrandSelection should already catch this.
    const merged = mergeLabels(EMPTY_SLOTS);
    return {
      normalised_requirements: req,
      candidates,
      presentation: {
        cards: [],
        empty_state: true,
        unfilled_slots: merged.unfilled_slots,
        scope: "SELECTED_BRANDS",
        state: "INVALID_BRAND_SELECTION",
        show_all_brands_action: true,
      },
      marketplace_preferences: {
        brand_ids: [],
        policy_version: MATCH_MARKETPLACE_BRAND_FILTER_VERSION,
      },
      error: "INVALID_BRAND_SELECTION",
      versions: matchAdapterVersions(),
    };
  }

  const merged = mergeLabels(brandResult.slots as MarketplaceSlots);

  return {
    normalised_requirements: req,
    candidates,
    presentation: {
      cards: merged.cards,
      empty_state:
        brandResult.state !== "RESULTS" || merged.cards.length === 0,
      unfilled_slots: merged.unfilled_slots,
      scope: brandResult.scope,
      state: brandResult.state,
      show_all_brands_action: brandResult.show_all_brands_action,
    },
    marketplace_preferences: {
      brand_ids: brandResult.selected_brand_ids,
      policy_version: MATCH_MARKETPLACE_BRAND_FILTER_VERSION,
    },
    versions: matchAdapterVersions(),
  };
}
