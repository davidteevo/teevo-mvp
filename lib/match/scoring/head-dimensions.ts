import {
  directionBiasToNumeric,
  evidenceReliability,
  launchTendencyToNumeric,
} from "../category";
import type { ReadonlyHeadRecord } from "../intelligence/load";
import type {
  DimensionName,
  DimensionTrace,
  NormalisedRequirements,
} from "../types";
import { scoreDirection, scoreLaunch, scoreMinimumNeed } from "./curves";
import { activeDim, inactiveDim, numField } from "./dim-helpers";

/**
 * Catalogue / listing-shared head characteristic dimensions.
 * Loft and shaft dimensions are intentionally excluded — loft is
 * configuration-bound; shaft requires a resolved physical variant.
 */
export const CATALOGUE_HEAD_DIMENSIONS = [
  "forgiveness",
  "stability",
  "workability",
  "direction",
  "head_launch",
] as const satisfies ReadonlyArray<DimensionName>;

export type CatalogueHeadDimension = (typeof CATALOGUE_HEAD_DIMENSIONS)[number];

export type HeadCharacteristicResult = {
  dimensions: Pick<
    Record<DimensionName, DimensionTrace>,
    CatalogueHeadDimension | "head_spin"
  >;
  gaps: {
    direction: number | null;
    head_launch: number | null;
  };
};

/**
 * Score head characteristic Fit dimensions using Phase 1 curves.
 * Identical logic for listing candidates and catalogue recommendations.
 */
export function scoreHeadCharacteristicDimensions(
  req: NormalisedRequirements,
  head: ReadonlyHeadRecord
): HeadCharacteristicResult {
  const dims = {} as HeadCharacteristicResult["dimensions"];
  const gaps: HeadCharacteristicResult["gaps"] = {
    direction: null,
    head_launch: null,
  };

  for (const [name, reqVal, headField, confField] of [
    ["forgiveness", req.forgiveness_requirement, "forgiveness", "forgiveness_confidence"],
    ["stability", req.stability_requirement, "stability", "stability_confidence"],
    ["workability", req.workability_preference, "workability", "workability_confidence"],
  ] as const) {
    const eq = numField(head[headField]);
    const rel = evidenceReliability(String(head[confField] || ""));
    if (reqVal == null || eq == null || rel <= 0) {
      dims[name] = inactiveDim(
        name,
        reqVal == null ? "REQUIREMENT_UNRESOLVED" : "EQUIPMENT_EVIDENCE_UNRESOLVED"
      );
    } else {
      const gap = Math.max(0, reqVal - eq);
      dims[name] = activeDim(name, rel, scoreMinimumNeed(gap));
    }
  }

  if (req.directional_target_numeric == null) {
    dims.direction = inactiveDim("direction", "REQUIREMENT_UNRESOLVED");
  } else {
    const bias = directionBiasToNumeric(String(head.directional_bias || ""));
    const rel = evidenceReliability(String(head.directional_bias_confidence || ""));
    if (bias == null || rel <= 0) {
      dims.direction = inactiveDim("direction", "EQUIPMENT_EVIDENCE_UNRESOLVED");
    } else {
      const gap = Math.abs(bias - req.directional_target_numeric);
      gaps.direction = gap;
      dims.direction = activeDim("direction", rel, scoreDirection(gap));
    }
  }

  if (
    req.head_launch_target === "UNRESOLVED" ||
    req.head_launch_target_numeric == null
  ) {
    dims.head_launch = inactiveDim("head_launch", "REQUIREMENT_UNRESOLVED");
  } else {
    const val = launchTendencyToNumeric(String(head.launch_tendency || ""));
    const rel = evidenceReliability(String(head.launch_confidence || ""));
    if (val == null || rel <= 0) {
      dims.head_launch = inactiveDim("head_launch", "EQUIPMENT_EVIDENCE_UNRESOLVED");
    } else {
      const gap = Math.abs(val - req.head_launch_target_numeric);
      gaps.head_launch = gap;
      dims.head_launch = activeDim("head_launch", rel, scoreLaunch(gap));
    }
  }

  dims.head_spin = inactiveDim("head_spin", "SPIN_INACTIVE_V1");

  return { dimensions: dims, gaps };
}

/** Count resolved catalogue-scorable requirement dimensions. */
export function countResolvedCatalogueRequirementDims(
  req: NormalisedRequirements
): number {
  let n = 0;
  if (req.forgiveness_requirement != null) n++;
  if (req.stability_requirement != null) n++;
  if (req.workability_preference != null) n++;
  if (req.directional_target_numeric != null) n++;
  if (
    req.head_launch_target !== "UNRESOLVED" &&
    req.head_launch_target_numeric != null
  ) {
    n++;
  }
  return n;
}

/**
 * Dimensions whose requirement_confidence includes evidence beyond BASELINE alone.
 * Pure baseline forgiveness/stability/workability must not unlock named rankings.
 */
export function countEvidenceBackedCatalogueRequirementDims(
  req: NormalisedRequirements
): number {
  let n = 0;
  for (const name of CATALOGUE_HEAD_DIMENSIONS) {
    const entry = req.requirement_confidence?.[name];
    if (!entry || entry.band === "UNRESOLVED") continue;
    const sources = entry.source_codes || [];
    const beyondBaseline = sources.some((c) => c !== "BASELINE");
    if (!beyondBaseline) continue;
    // Dimension must also be resolved on the requirement vector.
    if (name === "forgiveness" && req.forgiveness_requirement == null) continue;
    if (name === "stability" && req.stability_requirement == null) continue;
    if (name === "workability" && req.workability_preference == null) continue;
    if (name === "direction" && req.directional_target_numeric == null) continue;
    if (
      name === "head_launch" &&
      (req.head_launch_target === "UNRESOLVED" ||
        req.head_launch_target_numeric == null)
    ) {
      continue;
    }
    n++;
  }
  return n;
}

export function countActiveCatalogueDims(
  dimensions: Record<DimensionName, DimensionTrace>
): number {
  let n = 0;
  for (const name of CATALOGUE_HEAD_DIMENSIONS) {
    if (dimensions[name]?.active) n++;
  }
  return n;
}
