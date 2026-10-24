import { BAND_RANK, confidenceFromScore, matchBandFromScore } from "../bands";
import {
  CATALOGUE_MIN_INDEPENDENT_ACTIVE_DIMS,
  CATALOGUE_RECOMMENDATION_KIND,
  type CatalogueHeadScore,
} from "../catalogue-types";
import { clampConfidence, reliabilityToEquipmentPoints } from "../confidence";
import { applyGuardrails } from "../guardrails";
import {
  dedupeByRecommendationFamily,
  type HeadConfigOverlayIndex,
} from "../head-config-overlay";
import type { ReadonlyHeadRecord } from "../intelligence/load";
import type { UkHeadRelevanceIndex } from "../uk-head-relevance";
import {
  DIMENSION_NAMES,
  DIMENSION_WEIGHTS,
  type DimensionName,
  type DimensionTrace,
  type NormalisedRequirements,
} from "../types";
import { sortedSetValues } from "../util";
import { aggregateFit } from "./aggregate";
import { inactiveDim } from "./dim-helpers";
import {
  CATALOGUE_HEAD_DIMENSIONS,
  countActiveCatalogueDims,
  hasUnresolvedLaunchEquipmentEvidence,
  isMaterialHeadLaunchRequirement,
  scoreHeadCharacteristicDimensions,
} from "./head-dimensions";

function presentationCharsFromHead(head: ReadonlyHeadRecord): {
  directional_bias: string | null;
  primary_head_profile: string | null;
  launch_tendency: string | null;
} {
  const asStr = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? v.trim() : null;
  return {
    directional_bias: asStr(head.directional_bias),
    primary_head_profile: asStr(head.primary_head_profile),
    launch_tendency: asStr(head.launch_tendency),
  };
}

function isCatalogueEligibleHead(head: ReadonlyHeadRecord): boolean {
  return (
    head.intelligence_version === "DRIVER_V1" &&
    String(head.match_eligible).toUpperCase() === "TRUE" &&
    String(head.driver_subtype || "").toUpperCase() === "STANDARD" &&
    String(head.category || "").toUpperCase() === "DRIVER" &&
    String(head.rules_conformity || "").toUpperCase() !== "NON_CONFORMING"
  );
}

/**
 * Phase 2A catalogue presentation confidence: golfer + equipment only,
 * renormalised from the Phase 1 0.45/0.35 weights (listing term omitted).
 * Not Logic §38 overall confidence.
 */
export function cataloguePresentationConfidence(parts: {
  golfer: number;
  equipment: number;
}): { score: number; confidence: ReturnType<typeof confidenceFromScore> } {
  const score = clampConfidence(
    (0.45 * clampConfidence(parts.golfer) +
      0.35 * clampConfidence(parts.equipment)) /
      0.8
  );
  return { score, confidence: confidenceFromScore(score) };
}

/**
 * Score one Match-eligible catalogue head on characteristic dimensions only.
 * Loft and shaft Fit dimensions are inactive (no configuration).
 * Result type is CatalogueHeadScore — never CandidateScore.
 */
export function scoreCatalogueHead(input: {
  head: ReadonlyHeadRecord;
  requirements: NormalisedRequirements;
  golferConfidence: number;
}): CatalogueHeadScore {
  const { head, requirements: req, golferConfidence } = input;
  const key = String(head.catalogue_key || "");
  const brand =
    typeof head.brand === "string"
      ? head.brand
      : typeof head.Brand === "string"
        ? head.Brand
        : null;
  const model =
    typeof head.model === "string"
      ? head.model
      : typeof head.Model === "string"
        ? head.Model
        : null;
  const display =
    typeof head.display_name === "string" ? head.display_name : null;
  const yearRaw = head.release_year;
  const yearNum =
    typeof yearRaw === "number"
      ? yearRaw
      : yearRaw != null && yearRaw !== ""
        ? Number(yearRaw)
        : NaN;
  const release_year = Number.isFinite(yearNum) ? yearNum : null;
  const presentation_chars = presentationCharsFromHead(head);

  const base = {
    kind: CATALOGUE_RECOMMENDATION_KIND,
    catalogue_key: key,
    brand,
    model,
    display_name: display,
    release_year,
    presentation_chars,
    scope_disclaimer: "MODEL_LEVEL_SUITABILITY_ONLY" as const,
    guardrail_gaps: {
      direction: null as number | null,
      head_launch: null as number | null,
      loft: null,
      flex: null,
      shaft_launch: null,
    },
    confidence_components: {
      golfer: golferConfidence,
      equipment: 0,
      listing: null as null,
    },
  };

  if (!key || !isCatalogueEligibleHead(head)) {
    return {
      ...base,
      excluded: true,
      exclusion_reasons: ["HEAD_NOT_MATCH_ELIGIBLE"],
      catalogue_fit_score: null,
      catalogue_match_band: null,
      suppressed: false,
      scorable: false,
      dimensions: {},
      active_catalogue_dim_count: 0,
      head_recommendation_confidence_score: null,
      head_recommendation_confidence: null,
      considerations: [],
    };
  }

  const considerations = new Set<string>(req.conflict_flags);
  considerations.add("CATALOGUE_MODEL_LEVEL_ONLY");
  considerations.add("CATALOGUE_LOFT_OMITTED");
  considerations.add("CATALOGUE_SHAFT_OMITTED");

  const headChars = scoreHeadCharacteristicDimensions(req, head);
  const dims = {
    ...headChars.dimensions,
  } as Record<DimensionName, DimensionTrace>;

  // Configuration-bound / shaft dimensions — explicitly omitted for catalogue.
  dims.loft = inactiveDim("loft", "CATALOGUE_NO_CONFIGURATION");
  dims.flex = inactiveDim("flex", "CATALOGUE_NO_CONFIGURATION");
  dims.weight = inactiveDim("weight", "CATALOGUE_NO_CONFIGURATION");
  dims.shaft_launch = inactiveDim("shaft_launch", "CATALOGUE_NO_CONFIGURATION");
  dims.shaft_spin = inactiveDim("shaft_spin", "SPIN_INACTIVE_V1");

  for (const name of DIMENSION_NAMES) {
    if (!dims[name]) dims[name] = inactiveDim(name, "INTERNAL_MISSING");
  }

  const activeCount = countActiveCatalogueDims(dims);
  const agg = aggregateFit(
    DIMENSION_NAMES.filter((n) => dims[n].active).map((n) => ({
      weight: dims[n].nominal_weight,
      reliability: dims[n].reliability,
      score: dims[n].score as number,
    }))
  );

  const gaps = {
    direction: headChars.gaps.direction,
    head_launch: headChars.gaps.head_launch,
    loft: null,
    flex: null,
    shaft_launch: null,
  };

  if (!agg.scorable) {
    return {
      ...base,
      excluded: false,
      catalogue_fit_score: null,
      catalogue_match_band: null,
      suppressed: true,
      scorable: false,
      dimensions: dims,
      guardrail_gaps: gaps,
      active_catalogue_dim_count: activeCount,
      head_recommendation_confidence_score: null,
      head_recommendation_confidence: null,
      confidence_components: {
        golfer: golferConfidence,
        equipment: 0,
        listing: null,
      },
      considerations: sortedSetValues(considerations),
    };
  }

  const { suppressed, ceiling } = applyGuardrails({
    flex: null,
    loft: null,
    direction: gaps.direction,
    head_launch: gaps.head_launch,
    shaft_launch: null,
  });

  let band = matchBandFromScore(agg.score);
  if (ceiling && BAND_RANK[band] > BAND_RANK[ceiling]) {
    band = ceiling;
  }

  let eqNum = 0;
  let eqDen = 0;
  for (const n of CATALOGUE_HEAD_DIMENSIONS) {
    if (!dims[n].active) continue;
    eqNum +=
      DIMENSION_WEIGHTS[n] * reliabilityToEquipmentPoints(dims[n].reliability);
    eqDen += DIMENSION_WEIGHTS[n];
  }
  const equipment = eqDen > 0 ? eqNum / eqDen : 0;
  const presentation = cataloguePresentationConfidence({
    golfer: golferConfidence,
    equipment,
  });

  return {
    ...base,
    excluded: false,
    catalogue_fit_score: agg.score,
    catalogue_match_band: band,
    suppressed,
    scorable: true,
    dimensions: dims,
    guardrail_gaps: gaps,
    active_catalogue_dim_count: activeCount,
    head_recommendation_confidence_score: presentation.score,
    head_recommendation_confidence: presentation.confidence,
    confidence_components: {
      golfer: golferConfidence,
      equipment,
      listing: null,
    },
    considerations: sortedSetValues(considerations),
  };
}

export type CatalogueRankStats = {
  scored: number;
  excluded: number;
  below_band: number;
  insufficient_active_dims: number;
  low_confidence: number;
  suppressed: number;
  qualifying_heads: number;
  distinct_fit_scores: number;
  max_active_catalogue_dims: number;
  top_fit_share_count: number;
};

/**
 * Qualifying set Q: scorable, not suppressed, ≥min active dims,
 * band ≥ GOOD_MATCH, confidence not LOW.
 */
export function collectQualifyingCatalogueHeads(
  scored: CatalogueHeadScore[]
): { qualifying: CatalogueHeadScore[]; stats: CatalogueRankStats } {
  const stats: CatalogueRankStats = {
    scored: scored.length,
    excluded: 0,
    below_band: 0,
    insufficient_active_dims: 0,
    low_confidence: 0,
    suppressed: 0,
    qualifying_heads: 0,
    distinct_fit_scores: 0,
    max_active_catalogue_dims: 0,
    top_fit_share_count: 0,
  };

  const qualifying: CatalogueHeadScore[] = [];
  for (const s of scored) {
    if (s.excluded) {
      stats.excluded++;
      continue;
    }
    if (!s.scorable || s.catalogue_fit_score == null || !s.catalogue_match_band) {
      continue;
    }
    if (s.suppressed) {
      stats.suppressed++;
      continue;
    }
    if (s.active_catalogue_dim_count < CATALOGUE_MIN_INDEPENDENT_ACTIVE_DIMS) {
      stats.insufficient_active_dims++;
      continue;
    }
    if (BAND_RANK[s.catalogue_match_band] < BAND_RANK.GOOD_MATCH) {
      stats.below_band++;
      continue;
    }
    if (
      !s.head_recommendation_confidence ||
      s.head_recommendation_confidence === "LOW"
    ) {
      stats.low_confidence++;
      continue;
    }
    qualifying.push(s);
  }

  const fitValues = qualifying.map((q) => q.catalogue_fit_score as number);
  const fits = new Set(fitValues);
  stats.qualifying_heads = qualifying.length;
  stats.distinct_fit_scores = fits.size;
  stats.max_active_catalogue_dims = qualifying.reduce(
    (m, q) => Math.max(m, q.active_catalogue_dim_count),
    0
  );
  if (fitValues.length > 0) {
    const top = Math.max(...fitValues);
    stats.top_fit_share_count = fitValues.filter((f) => f === top).length;
  }
  return { qualifying, stats };
}

/**
 * Exact Fit equality for catalogue presentation / B2.1 tiers.
 * Matches existing Phase 2A rule: IEEE equality only (no epsilon).
 */
export function catalogueFitsEqual(
  a: number | null | undefined,
  b: number | null | undefined
): boolean {
  if (a == null || b == null) return false;
  return a === b;
}

/** Same band + exact Fit — the top suitability tier after presentation sort. */
export function sameCatalogueFitTier(
  a: CatalogueHeadScore,
  b: CatalogueHeadScore
): boolean {
  return (
    a.catalogue_match_band === b.catalogue_match_band &&
    catalogueFitsEqual(a.catalogue_fit_score, b.catalogue_fit_score)
  );
}

/**
 * B2.1 differentiation gate on post-family top-tied families (mixed-coverage safe).
 * - ≤3 families share top Fit tier → allow
 * - >3 top-tied AND every top-tied winner has ≥5 active dims → allow (disclose ties)
 * - >3 top-tied AND any top-tied winner has <5 active dims → block
 *
 * Does **not** use distinct_fits > 1 as an allow condition.
 * Does **not** let one fully covered family unlock incomplete peers (uses min, not max).
 * Coverage is assessed on top-tied families only (lower ranks cannot inflate it).
 */
export function lacksMeaningfulHeadDifferentiation(input: {
  top_tied_family_count: number;
  top_tied_min_active_dims: number;
}): boolean {
  if (input.top_tied_family_count <= 0) return false;
  if (input.top_tied_family_count <= 3) return false;
  if (input.top_tied_min_active_dims >= 5) return false;
  return true;
}

/** Presentation sort only — never mutates Fit scores. */
export function compareCataloguePresentationOrder(
  a: CatalogueHeadScore,
  b: CatalogueHeadScore
): number {
  const br =
    BAND_RANK[b.catalogue_match_band!] - BAND_RANK[a.catalogue_match_band!];
  if (br !== 0) return br;
  const fa = a.catalogue_fit_score as number;
  const fb = b.catalogue_fit_score as number;
  if (fb !== fa) return fb - fa;
  // Exact Fit tie + same band: newer release_year first, then catalogue_key.
  const ya = a.release_year ?? 0;
  const yb = b.release_year ?? 0;
  if (yb !== ya) return yb - ya;
  return a.catalogue_key.localeCompare(b.catalogue_key);
}

/**
 * Soft equal-Fit ordering within a tied tier only (does not change global comparator).
 * Prefer more complete assessed coverage, then year, then key.
 */
function compareEqualFitSoftPreference(
  a: CatalogueHeadScore,
  b: CatalogueHeadScore
): number {
  const da = a.active_catalogue_dim_count;
  const db = b.active_catalogue_dim_count;
  if (db !== da) return db - da;
  const ya = a.release_year ?? 0;
  const yb = b.release_year ?? 0;
  if (yb !== ya) return yb - ya;
  return a.catalogue_key.localeCompare(b.catalogue_key);
}

/** Active-dim signature for soft diversity among equal-Fit peers. */
function activeCharacteristicSignature(h: CatalogueHeadScore): string {
  const chars = h.presentation_chars;
  const parts: string[] = [];
  if (h.dimensions.direction?.active && chars?.directional_bias) {
    parts.push(`dir:${chars.directional_bias}`);
  }
  if (h.dimensions.head_launch?.active && chars?.launch_tendency) {
    parts.push(`launch:${chars.launch_tendency}`);
  }
  if (chars?.primary_head_profile) {
    parts.push(`profile:${chars.primary_head_profile}`);
  }
  return parts.join("|") || h.catalogue_key;
}

/**
 * Soft diversity among exact Fit/band ties: prefer evidence completeness and
 * assessed-characteristic variety, but still allow similar independent models
 * up to `limit`. Never promotes a lower Fit for diversity.
 */
export function selectCatalogueShortlist(
  familyWinners: CatalogueHeadScore[],
  limit: number
): CatalogueHeadScore[] {
  const cap = Math.max(0, limit);
  if (familyWinners.length === 0 || cap === 0) return [];
  if (familyWinners.length <= cap) return familyWinners.slice();

  const top = familyWinners[0];
  const topTier = familyWinners
    .filter((h) => sameCatalogueFitTier(h, top))
    .slice()
    .sort(compareEqualFitSoftPreference);
  const rest = familyWinners.filter((h) => !sameCatalogueFitTier(h, top));

  const selected: CatalogueHeadScore[] = [];
  const pool = topTier.slice();
  const usedSignatures = new Set<string>();

  while (selected.length < cap && pool.length > 0) {
    let pickIdx = 0;
    if (selected.length > 0) {
      const diverseIdx = pool.findIndex(
        (c) => !usedSignatures.has(activeCharacteristicSignature(c))
      );
      // Soft preference only — if every remaining peer shares a signature,
      // still take pool[0] (marketplace discovery of independent models).
      if (diverseIdx >= 0) pickIdx = diverseIdx;
    }
    const picked = pool.splice(pickIdx, 1)[0];
    selected.push(picked);
    usedSignatures.add(activeCharacteristicSignature(picked));
  }

  if (selected.length >= cap) return selected.slice(0, cap);
  return [...selected, ...rest].slice(0, cap);
}

export type CatalogueRankFamilyStats = {
  qualifying_heads_before_family_dedupe: number;
  qualifying_families_after_dedupe: number;
  family_duplicates_suppressed: number;
  recommendations_returned: number;
  top_tied_family_count: number;
  top_tied_max_active_dims: number;
  top_tied_min_active_dims: number;
  heads_held_config_overlay: number;
  heads_held_uk_market: number;
  heads_uk_market_eligible: number;
};

export function rankCatalogueHeads(
  scored: CatalogueHeadScore[],
  limit = 3,
  overlay?: HeadConfigOverlayIndex | null,
  ukOverlay?: UkHeadRelevanceIndex | null,
  requirements?: NormalisedRequirements | null
): {
  recommendations: CatalogueHeadScore[];
  stats: CatalogueRankStats;
  family_stats: CatalogueRankFamilyStats;
  differentiation_blocked: boolean;
  /** Top-tier examples when names are withheld. Not a ranked shortlist. */
  example_heads: CatalogueHeadScore[];
} {
  const { qualifying, stats } = collectQualifyingCatalogueHeads(scored);
  // Material launch filter: before family dedupe and B2.1 (not after).
  const launchFiltered =
    requirements && isMaterialHeadLaunchRequirement(requirements)
      ? qualifying.filter((h) => !hasUnresolvedLaunchEquipmentEvidence(h))
      : qualifying;
  const ordered = launchFiltered
    .slice()
    .sort(compareCataloguePresentationOrder);
  // Config + UK eligibility, then family dedupe across the full pool, before B2.1.
  const deduped = dedupeByRecommendationFamily(
    ordered,
    overlay ?? null,
    Number.POSITIVE_INFINITY,
    ukOverlay
  );
  const familyWinners = deduped.recommendations;

  const family_stats_base: CatalogueRankFamilyStats = {
    qualifying_heads_before_family_dedupe:
      deduped.qualifying_heads_before_family_dedupe,
    qualifying_families_after_dedupe: deduped.qualifying_families_after_dedupe,
    family_duplicates_suppressed: deduped.family_duplicates_suppressed,
    recommendations_returned: 0,
    top_tied_family_count: 0,
    top_tied_max_active_dims: 0,
    top_tied_min_active_dims: 0,
    heads_held_config_overlay: deduped.heads_held_config_overlay,
    heads_held_uk_market: deduped.heads_held_uk_market,
    heads_uk_market_eligible: deduped.heads_uk_market_eligible,
  };

  if (familyWinners.length === 0) {
    return {
      recommendations: [],
      stats,
      family_stats: family_stats_base,
      differentiation_blocked: false,
      example_heads: [],
    };
  }

  const top = familyWinners[0];
  const topTier = familyWinners.filter((h) => sameCatalogueFitTier(h, top));
  const top_tied_family_count = topTier.length;
  const top_tied_max_active_dims = topTier.reduce(
    (m, h) => Math.max(m, h.active_catalogue_dim_count),
    0
  );
  const top_tied_min_active_dims = topTier.reduce(
    (m, h) => Math.min(m, h.active_catalogue_dim_count),
    Number.POSITIVE_INFINITY
  );

  const family_stats: CatalogueRankFamilyStats = {
    ...family_stats_base,
    top_tied_family_count,
    top_tied_max_active_dims,
    top_tied_min_active_dims:
      top_tied_family_count > 0 ? top_tied_min_active_dims : 0,
  };

  // Audit: top_fit_share_count reports distinct top-tied *families* (B2.1).
  stats.top_fit_share_count = top_tied_family_count;

  if (
    lacksMeaningfulHeadDifferentiation({
      top_tied_family_count,
      top_tied_min_active_dims: family_stats.top_tied_min_active_dims,
    })
  ) {
    return {
      recommendations: [],
      stats,
      family_stats,
      differentiation_blocked: true,
      example_heads: selectCatalogueShortlist(topTier, limit),
    };
  }

  const recommendations = selectCatalogueShortlist(familyWinners, limit);
  return {
    recommendations,
    stats,
    family_stats: {
      ...family_stats,
      recommendations_returned: recommendations.length,
    },
    differentiation_blocked: false,
    example_heads: [],
  };
}
