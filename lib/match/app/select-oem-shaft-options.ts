import { matchBandFromScore } from "../bands";
import type { CatalogueHeadScore } from "../catalogue-types";
import { cataloguePresentationConfidence } from "../scoring/catalogue-head";
import { reliabilityToEquipmentPoints } from "../confidence";
import { applyGuardrails } from "../guardrails";
import type { MatchIntelligence } from "../intelligence/load";
import {
  MATCH_OEM_DRIVER_CONFIGS_VERSION,
  namedOemOfferingsForHead,
  type OemDriverConfigOffering,
  type OemDriverConfigsIndex,
} from "../oem-driver-configs";
import { aggregateCatalogueSuitability } from "../scoring/aggregate";
import { scoreShaftCharacteristicDimensions } from "../scoring/shaft-characteristics";
import {
  DIMENSION_WEIGHTS,
  type Band,
  type ConfidenceBand,
  type DimensionTrace,
  type NormalisedRequirements,
} from "../types";
import { MATCH_SHAFTS_VERSION } from "../versions";

/** Checkpoint C shaft-option contract — not a complete-driver configuration. */
export const OEM_SHAFT_OPTIONS_KIND = "OEM_SHAFT_OPTIONS_V1" as const;

export type OemShaftOptionAssessment = {
  kind: typeof OEM_SHAFT_OPTIONS_KIND;
  catalogue_key: string;
  shaft_key: string;
  shaft_manufacturer: string | null;
  shaft_model: string | null;
  shaft_display_name: string | null;
  flex_label: string | null;
  actual_weight_g: number | null;
  launch_profile: string | null;
  oem_offering_type: OemDriverConfigOffering["oem_offering_type"];
  offering_verification_status: OemDriverConfigOffering["offering_verification_status"];
  /** Explicit: Checkpoint B offerings are not verified complete configs. */
  configuration_claim: "VERIFIED_OEM_OFFERING_ONLY";
  suitability_score: number | null;
  suitability_band: Band | null;
  assessment_confidence_score: number | null;
  assessment_confidence: ConfidenceBand | null;
  confidence_components: {
    golfer: number;
    equipment: number;
    listing: null;
  };
  active_fitting_dimensions: Array<"flex" | "weight" | "shaft_launch">;
  dimensions: {
    flex: DimensionTrace;
    weight: DimensionTrace;
    shaft_launch: DimensionTrace;
    shaft_spin: DimensionTrace;
  };
  limitations: string[];
  selection_reasons: string[];
  evidence_refs: {
    oem_overlay_version: typeof MATCH_OEM_DRIVER_CONFIGS_VERSION;
    shafts_version: typeof MATCH_SHAFTS_VERSION;
    offering_id: string;
  };
  /** Internal diagnostics — not a consumer claim. */
  diagnostics: {
    shaft_family_key: string;
    flex_gap: number | null;
    shaft_launch_gap: number | null;
    suppressed: boolean;
    named_option_eligible: boolean;
    gate_failures: string[];
  };
};

export type OemShaftOptionsForHead = {
  catalogue_key: string;
  options: OemShaftOptionAssessment[];
  withheld_reason: string | null;
};

export type SelectOemShaftOptionsResult = {
  by_head: OemShaftOptionsForHead[];
  oem_overlay_status:
    | "LOADED"
    | "MISSING"
    | "INVALID"
    | "NOT_REQUESTED";
  audit: {
    heads_considered: number;
    offerings_considered: number;
    options_returned: number;
    heads_with_named_options: number;
  };
};

const MIN_SUITABILITY = 65;
const MAX_OPTIONS_PER_HEAD = 2;

function shaftFamilyKey(shaftKey: string): string {
  const parts = shaftKey.split("|");
  if (parts.length <= 1) return shaftKey;
  return parts.slice(0, -1).join("|");
}

function activeFittingDims(dims: {
  flex: DimensionTrace;
  weight: DimensionTrace;
  shaft_launch: DimensionTrace;
}): Array<"flex" | "weight" | "shaft_launch"> {
  const out: Array<"flex" | "weight" | "shaft_launch"> = [];
  if (dims.flex.active) out.push("flex");
  if (dims.weight.active) out.push("weight");
  if (dims.shaft_launch.active) out.push("shaft_launch");
  return out;
}

function equipmentConfidence(dims: {
  flex: DimensionTrace;
  weight: DimensionTrace;
  shaft_launch: DimensionTrace;
}): number {
  let num = 0;
  let den = 0;
  for (const name of ["flex", "weight", "shaft_launch"] as const) {
    if (!dims[name].active) continue;
    num +=
      DIMENSION_WEIGHTS[name] *
      reliabilityToEquipmentPoints(dims[name].reliability);
    den += DIMENSION_WEIGHTS[name];
  }
  return den > 0 ? num / den : 0;
}

function assessOffering(input: {
  catalogueKey: string;
  offering: OemDriverConfigOffering;
  requirements: NormalisedRequirements;
  intelligence: MatchIntelligence;
  golferConfidence: number;
}): OemShaftOptionAssessment | null {
  const { catalogueKey, offering, requirements, intelligence, golferConfidence } =
    input;
  const gate_failures: string[] = [];

  if (!offering.named_option_eligible) {
    gate_failures.push("NOT_NAMED_OPTION_ELIGIBLE");
  }
  if (offering.offering_verification_status !== "VERIFIED_OFFERING") {
    gate_failures.push("OFFERING_NOT_VERIFIED");
  }
  if (
    offering.shaft_identity_status !== "RESOLVED_MATCH_ELIGIBLE" ||
    !offering.shaft_key
  ) {
    gate_failures.push("SHAFT_IDENTITY_NOT_RESOLVED");
  }

  const shaftKey = offering.shaft_key;
  const shaft = shaftKey ? intelligence.shaftsByKey[shaftKey] : undefined;
  if (!shaft || shaft.match_eligibility !== "MATCH_ELIGIBLE") {
    gate_failures.push("SHAFT_NOT_MATCH_ELIGIBLE");
  }
  if (shaft && String(shaft.oem_variant ?? "").toUpperCase() === "AFTERMARKET") {
    gate_failures.push("AFTERMARKET_IDENTITY_BLOCKED");
  }

  if (
    requirements.shaft_flex_min_value == null ||
    requirements.shaft_flex_max_value == null
  ) {
    gate_failures.push("GOLFER_FLEX_REQUIREMENT_UNRESOLVED");
  }

  if (!shaft || gate_failures.length > 0) {
    return null;
  }

  const scored = scoreShaftCharacteristicDimensions(requirements, shaft);
  const dims = scored.dimensions;
  const active = activeFittingDims(dims);

  if (!dims.flex.active) {
    gate_failures.push("FLEX_ASSESSMENT_INACTIVE");
  }
  const hasSecondary = dims.weight.active || dims.shaft_launch.active;
  if (!hasSecondary) {
    gate_failures.push("INSUFFICIENT_SECONDARY_FITTING_DIMENSION");
  }

  const { suppressed } = applyGuardrails({
    flex: scored.gaps.flex,
    loft: null,
    direction: null,
    head_launch: null,
    shaft_launch: scored.gaps.shaft_launch,
  });
  if (suppressed) {
    gate_failures.push("FLEX_GUARDRAIL_SUPPRESSED");
  }

  const agg = aggregateCatalogueSuitability(
    active.map((name) => ({
      weight: dims[name].nominal_weight,
      score: dims[name].score as number,
    }))
  );

  if (!agg.scorable || agg.score == null) {
    gate_failures.push("SHAFT_SUITABILITY_UNSCORABLE");
  } else if (agg.score < MIN_SUITABILITY) {
    gate_failures.push("SHAFT_SUITABILITY_BELOW_THRESHOLD");
  }

  if (gate_failures.length > 0) {
    return null;
  }

  const equipment = equipmentConfidence(dims);
  const presentation = cataloguePresentationConfidence({
    golfer: golferConfidence,
    equipment,
  });
  const band = matchBandFromScore(agg.score!);
  const limitations: string[] = [
    "VERIFIED_OEM_OFFERING_ONLY",
    "NOT_A_VERIFIED_COMPLETE_DRIVER_CONFIGURATION",
    "NOT_AN_INVENTORY_AVAILABILITY_CLAIM",
  ];
  if (dims.shaft_spin.omission_reason === "SPIN_INACTIVE_V1") {
    limitations.push("SHAFT_SPIN_INACTIVE_V1");
  }
  if (!dims.weight.active) {
    limitations.push("WEIGHT_DIMENSION_INACTIVE");
  }
  if (!dims.shaft_launch.active) {
    limitations.push("SHAFT_LAUNCH_DIMENSION_INACTIVE");
  }

  const flexWindow =
    (requirements.shaft_flex_max_value ?? 0) -
    (requirements.shaft_flex_min_value ?? 0);
  const selection_reasons: string[] = [
    "VERIFIED_OEM_OFFERING",
    "MATCH_ELIGIBLE_SHAFT_IDENTITY",
  ];
  if (flexWindow > 1.5) {
    selection_reasons.push("WIDE_FLEX_EVIDENCE_WINDOW");
  }
  for (const name of active) {
    selection_reasons.push(`ACTIVE_${name.toUpperCase()}`);
  }

  const weightNum =
    shaft.actual_weight_g == null || shaft.actual_weight_g === ""
      ? null
      : Number(shaft.actual_weight_g);

  return {
    kind: OEM_SHAFT_OPTIONS_KIND,
    catalogue_key: catalogueKey,
    shaft_key: shaftKey!,
    shaft_manufacturer:
      typeof shaft.manufacturer === "string" ? shaft.manufacturer : null,
    shaft_model: typeof shaft.model === "string" ? shaft.model : null,
    shaft_display_name:
      typeof shaft.display_name === "string" ? shaft.display_name : null,
    flex_label:
      typeof shaft.flex === "string"
        ? shaft.flex
        : offering.flex_label,
    actual_weight_g: Number.isFinite(weightNum) ? weightNum : null,
    launch_profile:
      typeof shaft.launch_profile === "string" ? shaft.launch_profile : null,
    oem_offering_type: offering.oem_offering_type,
    offering_verification_status: offering.offering_verification_status,
    configuration_claim: "VERIFIED_OEM_OFFERING_ONLY",
    suitability_score: agg.score,
    suitability_band: band,
    assessment_confidence_score: presentation.score,
    assessment_confidence: presentation.confidence,
    confidence_components: {
      golfer: golferConfidence,
      equipment,
      listing: null,
    },
    active_fitting_dimensions: active,
    dimensions: dims,
    limitations,
    selection_reasons,
    evidence_refs: {
      oem_overlay_version: MATCH_OEM_DRIVER_CONFIGS_VERSION,
      shafts_version: MATCH_SHAFTS_VERSION,
      offering_id: offering.offering_id,
    },
    diagnostics: {
      shaft_family_key: shaftFamilyKey(shaftKey!),
      flex_gap: scored.gaps.flex,
      shaft_launch_gap: scored.gaps.shaft_launch,
      suppressed: false,
      named_option_eligible: true,
      gate_failures: [],
    },
  };
}

function compareOptions(
  a: OemShaftOptionAssessment,
  b: OemShaftOptionAssessment
): number {
  const suit = (b.suitability_score ?? 0) - (a.suitability_score ?? 0);
  if (suit !== 0) return suit;
  const conf =
    (b.assessment_confidence_score ?? 0) - (a.assessment_confidence_score ?? 0);
  if (conf !== 0) return conf;
  return a.shaft_key.localeCompare(b.shaft_key);
}

function selectDistinctFamilies(
  ranked: OemShaftOptionAssessment[]
): OemShaftOptionAssessment[] {
  const selected: OemShaftOptionAssessment[] = [];
  const families = new Set<string>();
  const wideFlex = ranked.some((o) =>
    o.selection_reasons.includes("WIDE_FLEX_EVIDENCE_WINDOW")
  );
  const topScore = ranked[0]?.suitability_score ?? null;
  const tiedAtTop =
    topScore != null &&
    ranked.filter((o) => o.suitability_score === topScore).length > 1;

  for (const option of ranked) {
    if (selected.length >= MAX_OPTIONS_PER_HEAD) break;
    const family = option.diagnostics.shaft_family_key;
    if (families.has(family)) continue;
    families.add(family);
    const reasons = [...option.selection_reasons];
    if (selected.length === 0) {
      reasons.push("PRIMARY_OEM_SHAFT_OPTION");
    } else {
      reasons.push("ALTERNATIVE_OEM_SHAFT_FAMILY");
      if (wideFlex || tiedAtTop) {
        reasons.push("PLAUSIBLE_ALTERNATIVE_NOT_UNIQUE_WINNER");
      }
    }
    selected.push({ ...option, selection_reasons: reasons });
  }
  return selected;
}

/**
 * Select up to two named OEM shaft options per displayed catalogue head.
 * Fail closed when the OEM overlay is missing/invalid or gates fail.
 * Does not alter head Fit, ranking, or inventory attach.
 */
export function selectOemShaftOptionsForHeads(input: {
  heads: readonly CatalogueHeadScore[];
  requirements: NormalisedRequirements;
  intelligence: MatchIntelligence;
  oemConfigs: OemDriverConfigsIndex | null;
  golferConfidence: number;
  oemOverlayStatus: SelectOemShaftOptionsResult["oem_overlay_status"];
}): SelectOemShaftOptionsResult {
  const {
    heads,
    requirements,
    intelligence,
    oemConfigs,
    golferConfidence,
    oemOverlayStatus,
  } = input;

  let offeringsConsidered = 0;
  let optionsReturned = 0;
  let headsWithOptions = 0;
  const by_head: OemShaftOptionsForHead[] = [];

  for (const head of heads) {
    if (!oemConfigs) {
      by_head.push({
        catalogue_key: head.catalogue_key,
        options: [],
        withheld_reason:
          oemOverlayStatus === "INVALID"
            ? "OEM_OVERLAY_INVALID"
            : oemOverlayStatus === "MISSING"
              ? "OEM_OVERLAY_MISSING"
              : "OEM_OVERLAY_UNAVAILABLE",
      });
      continue;
    }

    const offerings = namedOemOfferingsForHead(oemConfigs, head.catalogue_key);
    if (offerings.length === 0) {
      const member = oemConfigs.byCatalogueKey.get(head.catalogue_key);
      by_head.push({
        catalogue_key: head.catalogue_key,
        options: [],
        withheld_reason: member
          ? "NO_NAMED_ELIGIBLE_OEM_OFFERINGS"
          : "NO_OEM_MEMBER_FOR_HEAD",
      });
      continue;
    }

    offeringsConsidered += offerings.length;
    const assessed: OemShaftOptionAssessment[] = [];
    for (const offering of offerings) {
      const option = assessOffering({
        catalogueKey: head.catalogue_key,
        offering,
        requirements,
        intelligence,
        golferConfidence,
      });
      if (option) assessed.push(option);
    }

    if (assessed.length === 0) {
      by_head.push({
        catalogue_key: head.catalogue_key,
        options: [],
        withheld_reason: "NO_OPTION_PASSED_SHAFT_GATES",
      });
      continue;
    }

    assessed.sort(compareOptions);
    const selected = selectDistinctFamilies(assessed);
    optionsReturned += selected.length;
    if (selected.length > 0) headsWithOptions += 1;
    by_head.push({
      catalogue_key: head.catalogue_key,
      options: selected,
      withheld_reason: null,
    });
  }

  return {
    by_head,
    oem_overlay_status: oemOverlayStatus,
    audit: {
      heads_considered: heads.length,
      offerings_considered: offeringsConsidered,
      options_returned: optionsReturned,
      heads_with_named_options: headsWithOptions,
    },
  };
}
