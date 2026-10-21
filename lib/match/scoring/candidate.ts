import { matchBandFromScore, BAND_RANK } from "../bands";
import {
  evidenceReliability,
  launchTendencyToNumeric,
} from "../category";
import { aggregateConfidence, reliabilityToEquipmentPoints } from "../confidence";
import { applyGuardrails } from "../guardrails";
import { loftReachable, rangeGap } from "../loft";
import type {
  ReadonlyHeadRecord,
  ReadonlyShaftRecord,
} from "../intelligence/load";
import {
  DIMENSION_NAMES,
  DIMENSION_WEIGHTS,
  type CandidateScore,
  type DimensionName,
  type DimensionTrace,
  type InventoryListing,
  type ListingConfidenceDeduction,
  type NormalisedRequirements,
} from "../types";
import { sortedSetValues } from "../util";
import { aggregateFit } from "./aggregate";
import {
  scoreFlex,
  scoreLaunch,
  scoreLoft,
  scoreWeight,
} from "./curves";
import { activeDim, inactiveDim, numField } from "./dim-helpers";
import { scoreHeadCharacteristicDimensions } from "./head-dimensions";

function num(v: unknown): number | null {
  return numField(v);
}

function inactive(name: DimensionName, reason: string): DimensionTrace {
  return inactiveDim(name, reason);
}

type LoftPlan = {
  mode: string;
  stated: number;
  min?: number;
  max?: number;
  settings?: number[];
  usedLegacyDelta: boolean;
};

/** Prefer structured hosel fields; fall back to researched legacy delta only when needed. */
export function planListingLoft(
  head: ReadonlyHeadRecord,
  stated: number
): LoftPlan {
  const mode = String(head.hosel_loft_adjustment_type || "NONE").toUpperCase();
  const settingsRaw = head.hosel_loft_settings;
  let settings: number[] | undefined;
  if (typeof settingsRaw === "string" && settingsRaw.trim()) {
    settings = settingsRaw
      .split(/[|,]/)
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));
  } else if (Array.isArray(settingsRaw)) {
    settings = settingsRaw.map(Number).filter((n) => Number.isFinite(n));
  }

  const structuredMin = numField(head.hosel_loft_setting_min_deg);
  const structuredMax = numField(head.hosel_loft_setting_max_deg);
  const legacyMin = numField(head.loft_adjustment_min_deg);
  const legacyMax = numField(head.loft_adjustment_max_deg);
  const hasStructured =
    (settings != null && settings.length > 0) ||
    (structuredMin != null && structuredMax != null);
  const hasLegacy = legacyMin != null && legacyMax != null;

  let min: number | undefined;
  let max: number | undefined;
  let usedLegacyDelta = false;
  if (mode === "DELTA_RANGE") {
    if (hasStructured) {
      min = structuredMin ?? undefined;
      max = structuredMax ?? undefined;
    } else if (hasLegacy) {
      min = legacyMin!;
      max = legacyMax!;
      usedLegacyDelta = true;
    }
  } else if (mode === "PUBLISHED_SETTINGS") {
    min = structuredMin ?? undefined;
    max = structuredMax ?? undefined;
  }

  return { mode, stated, min, max, settings, usedLegacyDelta };
}

export function scoreCandidate(input: {
  listing: InventoryListing;
  requirements: NormalisedRequirements;
  head: ReadonlyHeadRecord | undefined;
  shaft: ReadonlyShaftRecord | undefined;
  golferConfidence: number;
}): CandidateScore {
  const { listing, requirements: req, head, shaft, golferConfidence } = input;
  const considerations = new Set<string>(req.conflict_flags);
  const listingDeductions: ListingConfidenceDeduction[] = [];

  if (!listing.publicly_purchasable) {
    return {
      listing_id: listing.listing_id,
      excluded: true,
      exclusion_reasons: ["NOT_PURCHASABLE"],
    };
  }
  if (!head) {
    return {
      listing_id: listing.listing_id,
      excluded: true,
      exclusion_reasons: ["UNRESOLVED_HEAD_IDENTITY"],
    };
  }
  if (
    head.intelligence_version !== "DRIVER_V1" ||
    String(head.match_eligible).toUpperCase() !== "TRUE" ||
    String(head.driver_subtype || "").toUpperCase() !== "STANDARD" ||
    String(head.rules_conformity || "").toUpperCase() === "NON_CONFORMING"
  ) {
    return {
      listing_id: listing.listing_id,
      excluded: true,
      exclusion_reasons: ["HEAD_NOT_MATCH_ELIGIBLE"],
    };
  }
  if (listing.shaft_key == null) {
    return {
      listing_id: listing.listing_id,
      excluded: true,
      exclusion_reasons: ["UNRESOLVED_SHAFT_IDENTITY"],
    };
  }
  if (!shaft || shaft.match_eligibility !== "MATCH_ELIGIBLE") {
    return {
      listing_id: listing.listing_id,
      excluded: true,
      exclusion_reasons: ["SHAFT_NOT_MATCH_ELIGIBLE"],
    };
  }
  if (
    String(listing.handedness).toUpperCase() !==
    String(req.handedness).toUpperCase()
  ) {
    return {
      listing_id: listing.listing_id,
      excluded: true,
      exclusion_reasons: ["HANDEDNESS_MISMATCH"],
    };
  }
  if (listing.stated_loft_deg == null || !Number.isFinite(listing.stated_loft_deg)) {
    return {
      listing_id: listing.listing_id,
      excluded: true,
      exclusion_reasons: ["UNUSABLE_LOFT"],
    };
  }

  const headChars = scoreHeadCharacteristicDimensions(req, head);
  const dims = {
    ...headChars.dimensions,
  } as Record<DimensionName, DimensionTrace>;
  const gaps: Record<string, number | null> = {
    flex: null,
    loft: null,
    direction: headChars.gaps.direction,
    head_launch: headChars.gaps.head_launch,
    shaft_launch: null,
  };

  dims.shaft_spin = inactive("shaft_spin", "SPIN_INACTIVE_V1");

  // loft
  let loftPlan: LoftPlan | null = null;
  let statedOutsideActiveTarget = false;
  let adjustableIntoTarget = false;
  if (req.preferred_loft_min_deg == null || req.preferred_loft_max_deg == null) {
    dims.loft = inactive("loft", "REQUIREMENT_UNRESOLVED");
  } else {
    loftPlan = planListingLoft(head, listing.stated_loft_deg);
    const reachable = loftReachable(loftPlan);
    const gap = rangeGap(
      reachable,
      req.preferred_loft_min_deg,
      req.preferred_loft_max_deg
    );
    gaps.loft = gap;
    dims.loft = activeDim("loft", 1, scoreLoft(gap));
    const statedGap = rangeGap(
      listing.stated_loft_deg,
      req.preferred_loft_min_deg,
      req.preferred_loft_max_deg
    );
    statedOutsideActiveTarget = statedGap > 0;
    if (gap === 0 && loftPlan.mode === "DELTA_RANGE" && statedOutsideActiveTarget) {
      adjustableIntoTarget = true;
      considerations.add("LOFT_ADJUSTABLE_INTO_TARGET");
    }
  }

  // flex
  if (req.shaft_flex_min_value == null || req.shaft_flex_max_value == null) {
    dims.flex = inactive("flex", "REQUIREMENT_UNRESOLVED");
  } else if (shaft.match_flex_mapping_status !== "MAPPED") {
    dims.flex = inactive("flex", "SHAFT_FLEX_UNMAPPED");
    considerations.add("SHAFT_FLEX_UNMAPPED");
  } else {
    const flexVal = num(shaft.match_flex_value);
    if (flexVal == null) {
      dims.flex = inactive("flex", "SHAFT_FLEX_UNMAPPED");
      considerations.add("SHAFT_FLEX_UNMAPPED");
    } else {
      const gap = rangeGap(flexVal, req.shaft_flex_min_value, req.shaft_flex_max_value);
      gaps.flex = gap;
      dims.flex = activeDim("flex", 1, scoreFlex(gap));
    }
  }

  // weight
  if (req.shaft_weight_min_g == null || req.shaft_weight_max_g == null) {
    dims.weight = inactive("weight", "REQUIREMENT_UNRESOLVED");
  } else {
    const wt = num(shaft.actual_weight_g);
    const wconf = String(shaft.match_weight_confidence || "");
    const weightReliability = evidenceReliability(wconf);
    if (
      wt == null ||
      wconf === "UNRESOLVED" ||
      wconf === "NOT_APPLICABLE" ||
      weightReliability <= 0
    ) {
      dims.weight = inactive("weight", "SHAFT_WEIGHT_UNKNOWN");
      considerations.add("SHAFT_WEIGHT_UNKNOWN");
    } else {
      const gap = rangeGap(wt, req.shaft_weight_min_g, req.shaft_weight_max_g);
      dims.weight = activeDim("weight", weightReliability, scoreWeight(gap));
    }
  }

  // shaft launch
  if (
    req.shaft_launch_target === "UNRESOLVED" ||
    req.shaft_launch_target_numeric == null
  ) {
    dims.shaft_launch = inactive("shaft_launch", "REQUIREMENT_UNRESOLVED");
  } else if (shaft.match_launch_resolution_status !== "RESOLVED") {
    dims.shaft_launch = inactive("shaft_launch", "SHAFT_LAUNCH_UNRESOLVED");
  } else {
    const val = launchTendencyToNumeric(String(shaft.launch_profile || ""));
    const rel = evidenceReliability(String(shaft.launch_confidence || ""));
    if (val == null || rel <= 0) {
      dims.shaft_launch = inactive("shaft_launch", "SHAFT_LAUNCH_UNRESOLVED");
    } else {
      const gap = Math.abs(val - req.shaft_launch_target_numeric);
      gaps.shaft_launch = gap;
      dims.shaft_launch = activeDim("shaft_launch", rel, scoreLaunch(gap));
    }
  }

  for (const name of DIMENSION_NAMES) {
    if (!dims[name]) dims[name] = inactive(name, "INTERNAL_MISSING");
  }

  const agg = aggregateFit(
    DIMENSION_NAMES.filter((n) => dims[n].active).map((n) => ({
      weight: dims[n].nominal_weight,
      reliability: dims[n].reliability,
      score: dims[n].score as number,
    }))
  );

  if (!agg.scorable) {
    return {
      listing_id: listing.listing_id,
      excluded: false,
      raw_fit_score: null,
      match_band: null,
      suppressed: true,
      dimensions: dims,
      guardrail_gaps: gaps,
      confidence_components: {
        golfer: golferConfidence,
        equipment: 0,
        listing: 0,
      },
      confidence_score: null,
      confidence: null,
      considerations: sortedSetValues(considerations),
      listing_confidence_deductions: [],
      scorable: false,
    };
  }

  const { suppressed, ceiling } = applyGuardrails({
    flex: gaps.flex,
    loft: gaps.loft,
    direction: gaps.direction,
    head_launch: gaps.head_launch,
    shaft_launch: gaps.shaft_launch,
  });

  let band = matchBandFromScore(agg.score);
  if (ceiling && BAND_RANK[band] > BAND_RANK[ceiling]) {
    band = ceiling;
  }

  // equipment confidence
  let eqNum = 0;
  let eqDen = 0;
  for (const n of DIMENSION_NAMES) {
    if (!dims[n].active) continue;
    eqNum +=
      DIMENSION_WEIGHTS[n] * reliabilityToEquipmentPoints(dims[n].reliability);
    eqDen += DIMENSION_WEIGHTS[n];
  }
  const equipment = eqDen > 0 ? eqNum / eqDen : 0;

  // listing confidence (RULES_V1_2 / Logic §38) — record each deduction once
  const deduct = (code: string, amount: number) => {
    if (listingDeductions.some((d) => d.code === code)) return;
    listingDeductions.push({ code, amount });
  };

  if (
    dims.flex.omission_reason === "SHAFT_FLEX_UNMAPPED" &&
    req.shaft_flex_min_value != null
  ) {
    deduct("LISTING_FLEX_UNMAPPED", 10);
  }
  if (
    dims.weight.omission_reason === "SHAFT_WEIGHT_UNKNOWN" &&
    req.shaft_weight_min_g != null
  ) {
    deduct("LISTING_WEIGHT_UNAVAILABLE", 5);
  }
  if (
    !dims.shaft_launch.active &&
    req.shaft_launch_target !== "UNRESOLVED" &&
    req.shaft_launch_target_numeric != null
  ) {
    deduct("LISTING_SHAFT_LAUNCH_UNAVAILABLE", 5);
  }
  // Legacy delta loft fallback only when adjustment is actually needed for target access.
  if (
    loftPlan?.usedLegacyDelta &&
    adjustableIntoTarget &&
    req.preferred_loft_min_deg != null
  ) {
    deduct("LISTING_LEGACY_LOFT_DELTA", 5);
    considerations.add("LISTING_LEGACY_LOFT_DELTA");
  }
  // Unknown hosel range when stated loft sits outside an active target.
  if (
    loftPlan?.mode === "UNKNOWN" &&
    statedOutsideActiveTarget &&
    req.preferred_loft_min_deg != null
  ) {
    deduct("LISTING_UNKNOWN_HOSEL_RANGE", 5);
    considerations.add("LISTING_UNKNOWN_HOSEL_RANGE");
  }

  for (const name of [
    "forgiveness",
    "stability",
    "direction",
    "head_launch",
    "workability",
  ] as DimensionName[]) {
    const reqActive =
      (name === "forgiveness" && req.forgiveness_requirement != null) ||
      (name === "stability" && req.stability_requirement != null) ||
      (name === "workability" && req.workability_preference != null) ||
      (name === "direction" && req.directional_target_numeric != null) ||
      (name === "head_launch" && req.head_launch_target_numeric != null);
    if (
      reqActive &&
      !dims[name].active &&
      dims[name].omission_reason === "EQUIPMENT_EVIDENCE_UNRESOLVED"
    ) {
      deduct(`LISTING_HEAD_${name.toUpperCase()}_UNAVAILABLE`, 5);
    }
  }

  const listingConf = Math.max(
    0,
    Math.min(
      100,
      100 - listingDeductions.reduce((sum, d) => sum + d.amount, 0)
    )
  );

  const overall = aggregateConfidence({
    golfer: golferConfidence,
    equipment,
    listing: listingConf,
  });

  return {
    listing_id: listing.listing_id,
    excluded: false,
    raw_fit_score: agg.score,
    match_band: band,
    suppressed,
    dimensions: dims,
    guardrail_gaps: gaps,
    confidence_components: {
      golfer: golferConfidence,
      equipment,
      listing: listingConf,
    },
    confidence_score: overall.score,
    confidence: overall.confidence,
    considerations: sortedSetValues(considerations),
    listing_confidence_deductions: listingDeductions,
    scorable: true,
  };
}
