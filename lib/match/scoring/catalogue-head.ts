import { BAND_RANK, confidenceFromScore, matchBandFromScore } from "../bands";
import {
  CATALOGUE_MIN_INDEPENDENT_ACTIVE_DIMS,
  CATALOGUE_RECOMMENDATION_KIND,
  type CatalogueHeadScore,
} from "../catalogue-types";
import { clampConfidence, reliabilityToEquipmentPoints } from "../confidence";
import { applyGuardrails } from "../guardrails";
import type { ReadonlyHeadRecord } from "../intelligence/load";
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
  scoreHeadCharacteristicDimensions,
} from "./head-dimensions";

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

  const base = {
    kind: CATALOGUE_RECOMMENDATION_KIND,
    catalogue_key: key,
    brand,
    model,
    display_name: display,
    release_year,
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
 * PHASE_2A.md differentiation gate — see docs for (A)/(B).
 * Reuses Fit scores and active-dim counts only.
 */
export function lacksMeaningfulHeadDifferentiation(
  stats: Pick<
    CatalogueRankStats,
    | "qualifying_heads"
    | "distinct_fit_scores"
    | "max_active_catalogue_dims"
    | "top_fit_share_count"
  >
): boolean {
  if (stats.qualifying_heads <= 0) return false;
  if (stats.max_active_catalogue_dims >= 5) return false;
  const flatPool =
    stats.distinct_fit_scores === 1 && stats.max_active_catalogue_dims < 5;
  const crowdedTop =
    stats.max_active_catalogue_dims < 5 && stats.top_fit_share_count > 3;
  return flatPool || crowdedTop;
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

export function rankCatalogueHeads(
  scored: CatalogueHeadScore[],
  limit = 3
): {
  recommendations: CatalogueHeadScore[];
  stats: CatalogueRankStats;
  differentiation_blocked: boolean;
} {
  const { qualifying, stats } = collectQualifyingCatalogueHeads(scored);
  if (lacksMeaningfulHeadDifferentiation(stats)) {
    return {
      recommendations: [],
      stats,
      differentiation_blocked: true,
    };
  }

  const ordered = qualifying.slice().sort(compareCataloguePresentationOrder);
  return {
    recommendations: ordered.slice(0, Math.max(0, limit)),
    stats,
    differentiation_blocked: false,
  };
}
