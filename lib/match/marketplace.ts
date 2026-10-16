import { BAND_RANK } from "./bands";
import type { MarketplaceCandidate } from "./types";

export function moneySavingQualifies(
  bestPricePence: number,
  candidatePricePence: number
): boolean {
  const savings = bestPricePence - candidatePricePence;
  return savings >= 2000 && 10 * savings >= bestPricePence;
}

function confidenceScoreOf(c: MarketplaceCandidate): number {
  if (typeof c.confidence_score === "number") return c.confidence_score;
  if (c.confidence === "HIGH") return 100;
  if (c.confidence === "MEDIUM") return 70;
  return 0;
}

function equipmentOrder(a: MarketplaceCandidate, b: MarketplaceCandidate): number {
  const br = BAND_RANK[b.band] - BAND_RANK[a.band];
  if (br !== 0) return br;
  if (b.score !== a.score) return b.score - a.score;
  const cf = confidenceScoreOf(b) - confidenceScoreOf(a);
  if (cf !== 0) return cf;
  if (a.listing_id < b.listing_id) return -1;
  if (a.listing_id > b.listing_id) return 1;
  return 0;
}

function toPence(priceGbp: number): number {
  return Math.round(priceGbp * 100);
}

export type MarketplaceSlots = {
  BEST_MATCH: string | null;
  BEST_VALUE: string | null;
  BUDGET_OPTION: string | null;
};

export function selectMarketplaceSlots(
  candidates: MarketplaceCandidate[],
  budget: number | null | undefined
): { slots: MarketplaceSlots; unique_cards: number } {
  const ids = new Set<string>();
  for (const c of candidates) {
    if (ids.has(c.listing_id)) {
      throw new Error(`Duplicate listing_id in marketplace snapshot: ${c.listing_id}`);
    }
    ids.add(c.listing_id);
  }

  const eligible = candidates
    .filter(
      (c) =>
        !c.suppressed &&
        BAND_RANK[c.band] >= 1 &&
        (c.confidence === "HIGH" || c.confidence === "MEDIUM")
    )
    .slice()
    .sort(equipmentOrder);

  const best = eligible[0] ?? null;

  let near = best
    ? eligible.filter(
        (c) => BAND_RANK[c.band] >= 2 && best.score - c.score <= 7
      )
    : [];
  if (budget != null && near.some((c) => c.price_gbp <= budget)) {
    near = near.filter((c) => c.price_gbp <= budget);
  }
  near = near.slice().sort((a, b) => {
    if (a.price_gbp !== b.price_gbp) return a.price_gbp - b.price_gbp;
    return equipmentOrder(a, b);
  });

  let value: MarketplaceCandidate | null = near[0] ?? null;
  if (value && best) {
    if (
      !moneySavingQualifies(toPence(best.price_gbp), toPence(value.price_gbp))
    ) {
      value = null;
    }
  }

  const affordable = eligible.filter(
    (c) => budget == null || c.price_gbp <= budget
  );
  affordable.sort((a, b) => {
    if (a.price_gbp !== b.price_gbp) return a.price_gbp - b.price_gbp;
    return equipmentOrder(a, b);
  });
  const cheap = affordable[0] ?? null;

  const slots: MarketplaceSlots = {
    BEST_MATCH: best?.listing_id ?? null,
    BEST_VALUE: value?.listing_id ?? null,
    BUDGET_OPTION: cheap?.listing_id ?? null,
  };
  return {
    slots,
    unique_cards: new Set(
      Object.values(slots).filter((v): v is string => v != null)
    ).size,
  };
}

export function mergeLabels(slots: MarketplaceSlots): {
  cards: Array<{ listing_id: string; labels: string[] }>;
  unfilled_slots: string[];
} {
  const cards: Array<{ listing_id: string; labels: string[] }> = [];
  const unfilled: string[] = [];
  for (const label of ["BEST_MATCH", "BEST_VALUE", "BUDGET_OPTION"] as const) {
    const target = slots[label];
    if (target == null) {
      unfilled.push(label);
      continue;
    }
    let card = cards.find((c) => c.listing_id === target);
    if (!card) {
      card = { listing_id: target, labels: [] };
      cards.push(card);
    }
    card.labels.push(label);
  }
  return { cards, unfilled_slots: unfilled };
}

export function brandMarketplace(input: {
  selected_brand_ids: string[] | null | undefined;
  known_brand_ids: string[];
  candidates: MarketplaceCandidate[];
  budget: number | null | undefined;
}):
  | {
      selected_brand_ids: string[];
      scope: "ALL_BRANDS" | "SELECTED_BRANDS";
      slots: MarketplaceSlots;
      unique_cards: number;
      state: string;
      show_all_brands_action: boolean;
      fit_snapshot: Array<{
        listing_id: string;
        score: number;
        band: string;
        confidence: string;
        suppressed: boolean;
      }>;
    }
  | { error: "INVALID_BRAND_SELECTION"; invalid_ids: string[] } {
  const known = new Set(input.known_brand_ids);
  const raw = input.selected_brand_ids;
  if (raw != null && raw.length > 0) {
    const invalid = Array.from(
      new Set(raw.filter((id) => !known.has(id)))
    ).sort();
    if (invalid.length > 0) {
      return { error: "INVALID_BRAND_SELECTION", invalid_ids: invalid };
    }
  }
  // null / undefined / [] → all brands (explicit empty filter behaviour)
  const selected =
    raw == null || raw.length === 0 ? [] : Array.from(new Set(raw)).sort();
  const scope = selected.length > 0 ? "SELECTED_BRANDS" : "ALL_BRANDS";

  const fit_snapshot = input.candidates
    .slice()
    .sort((a, b) =>
      a.listing_id < b.listing_id ? -1 : a.listing_id > b.listing_id ? 1 : 0
    )
    .map((c) => ({
      listing_id: c.listing_id,
      score: c.score,
      band: c.band,
      confidence: c.confidence,
      suppressed: !!c.suppressed,
    }));

  let pool = input.candidates.filter(
    (c) => c.publicly_purchasable !== false
  );
  if (selected.length > 0) {
    const allow = new Set(selected);
    pool = pool.filter((c) => c.head_brand_id && allow.has(c.head_brand_id));
  }

  const { slots, unique_cards } = selectMarketplaceSlots(pool, input.budget);
  const hasResults = unique_cards > 0;
  let state = "RESULTS";
  if (!hasResults) {
    state =
      selected.length > 0
        ? "NO_QUALIFYING_IN_SELECTED_BRANDS"
        : "NO_QUALIFYING_INVENTORY";
  }

  return {
    selected_brand_ids: selected,
    scope,
    slots,
    unique_cards,
    state,
    show_all_brands_action: selected.length > 0 && state !== "RESULTS",
    fit_snapshot,
  };
}
