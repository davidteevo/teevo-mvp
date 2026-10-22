import type { CatalogueHeadScore } from "../catalogue-types";
import { BAND_RANK } from "../bands";

/**
 * Presentation categories for heads the engine has already recommended.
 * This does not score, filter, or reorder those heads.
 */
export type HeadChoiceCategory = "BEST_MATCH" | "NEWER_OPTION" | "ALTERNATIVE_MATCH";

export const HEAD_CHOICE_LABEL: Record<HeadChoiceCategory, string> = {
  BEST_MATCH: "Best Match",
  NEWER_OPTION: "Newer Option",
  ALTERNATIVE_MATCH: "Alternative Match",
};

export type HeadChoice = {
  catalogueKey: string;
  category: HeadChoiceCategory | null;
  label: string | null;
  /** True when this head shares the top assessed suitability with another head. */
  tiedForTopSuitability: boolean;
  note: string | null;
};

const TIED_BEST_NOTE =
  "Tied for the top suitability we could assess. Another recommended head reached the same result.";

const NEWER_TIED_NOTE =
  "A more recent model with the same assessed suitability. A later release year is not a better fit.";

const NEWER_NOTE =
  "A more recent model that still suits what we could assess. A later release year is not a better fit.";

type FitTier = { band: number; fit: number };

function fitTier(head: CatalogueHeadScore): FitTier | null {
  if (head.catalogue_match_band == null) return null;
  if (head.catalogue_fit_score == null || !Number.isFinite(head.catalogue_fit_score)) return null;
  return { band: BAND_RANK[head.catalogue_match_band], fit: head.catalogue_fit_score };
}

function sameTier(a: FitTier, b: FitTier): boolean {
  return a.band === b.band && a.fit === b.fit;
}

function releaseYear(head: CatalogueHeadScore): number | null {
  return head.release_year != null && Number.isFinite(head.release_year) ? head.release_year : null;
}

function differentModel(a: CatalogueHeadScore, b: CatalogueHeadScore): boolean {
  const left = a.model?.trim().toLowerCase() ?? "";
  const right = b.model?.trim().toLowerCase() ?? "";
  if (left && right) return left !== right;
  return a.catalogue_key !== b.catalogue_key;
}

/**
 * Label each recommended head once, in the order the engine returned them.
 * Best Value is never assigned: there is no dated UK used-price reference yet.
 */
export function presentHeadChoices(heads: CatalogueHeadScore[]): HeadChoice[] {
  const tiers = heads.map(fitTier);
  let top: FitTier | null = null;
  for (const tier of tiers) {
    if (!tier) continue;
    if (!top || tier.band > top.band || (tier.band === top.band && tier.fit > top.fit)) {
      top = tier;
    }
  }

  let bestIndex = -1;
  if (top) {
    bestIndex = tiers.findIndex((tier) => tier != null && sameTier(tier, top));
  }

  const best = bestIndex >= 0 ? heads[bestIndex] : null;
  const bestYear = best ? releaseYear(best) : null;
  const tiedIndexes = new Set<number>();
  if (top && best) {
    tiers.forEach((tier, index) => {
      if (tier && sameTier(tier, top)) tiedIndexes.add(index);
    });
  }
  const topIsTied = tiedIndexes.size > 1;

  let newerIndex = -1;
  if (best && bestYear != null) {
    let newestYear = bestYear;
    heads.forEach((head, index) => {
      if (index === bestIndex) return;
      if (head.catalogue_key === best.catalogue_key) return;
      if (!differentModel(head, best)) return;
      const year = releaseYear(head);
      if (year == null || year <= bestYear) return;
      if (newerIndex === -1 || year > newestYear) {
        newerIndex = index;
        newestYear = year;
      }
    });
  }

  const seen = new Set<string>();
  return heads.map((head, index) => {
    const duplicate = seen.has(head.catalogue_key);
    seen.add(head.catalogue_key);
    if (duplicate || bestIndex < 0) {
      return {
        catalogueKey: head.catalogue_key,
        category: null,
        label: null,
        tiedForTopSuitability: false,
        note: null,
      };
    }
    const tied = topIsTied && tiedIndexes.has(index);
    if (index === bestIndex) {
      return {
        catalogueKey: head.catalogue_key,
        category: "BEST_MATCH",
        label: HEAD_CHOICE_LABEL.BEST_MATCH,
        tiedForTopSuitability: tied,
        note: tied ? TIED_BEST_NOTE : null,
      };
    }
    if (index === newerIndex) {
      return {
        catalogueKey: head.catalogue_key,
        category: "NEWER_OPTION",
        label: HEAD_CHOICE_LABEL.NEWER_OPTION,
        tiedForTopSuitability: tied,
        note: tied ? NEWER_TIED_NOTE : NEWER_NOTE,
      };
    }
    return {
      catalogueKey: head.catalogue_key,
      category: "ALTERNATIVE_MATCH",
      label: HEAD_CHOICE_LABEL.ALTERNATIVE_MATCH,
      tiedForTopSuitability: tied,
      note: null,
    };
  });
}
