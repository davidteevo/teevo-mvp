import {
  evidenceReliability,
  launchTendencyToNumeric,
} from "../category";
import type { ReadonlyShaftRecord } from "../intelligence/load";
import { rangeGap } from "../loft";
import type {
  DimensionName,
  DimensionTrace,
  NormalisedRequirements,
} from "../types";
import { scoreFlex, scoreLaunch, scoreWeight } from "./curves";
import { activeDim, inactiveDim, numField } from "./dim-helpers";

export type ShaftCharacteristicGaps = {
  flex: number | null;
  shaft_launch: number | null;
};

export type ShaftCharacteristicScore = {
  dimensions: {
    flex: DimensionTrace;
    weight: DimensionTrace;
    shaft_launch: DimensionTrace;
    shaft_spin: DimensionTrace;
  };
  gaps: ShaftCharacteristicGaps;
  considerations: string[];
};

function inactive(name: DimensionName, reason: string): DimensionTrace {
  return inactiveDim(name, reason);
}

/**
 * Pure shaft flex / weight / launch scoring shared by listing Fit and OEM
 * shaft-option assessment. Spin stays inactive under V1 policy.
 */
export function scoreShaftCharacteristicDimensions(
  req: NormalisedRequirements,
  shaft: ReadonlyShaftRecord
): ShaftCharacteristicScore {
  const considerations: string[] = [];
  const gaps: ShaftCharacteristicGaps = {
    flex: null,
    shaft_launch: null,
  };

  let flex: DimensionTrace;
  if (req.shaft_flex_min_value == null || req.shaft_flex_max_value == null) {
    flex = inactive("flex", "REQUIREMENT_UNRESOLVED");
  } else if (shaft.match_flex_mapping_status !== "MAPPED") {
    flex = inactive("flex", "SHAFT_FLEX_UNMAPPED");
    considerations.push("SHAFT_FLEX_UNMAPPED");
  } else {
    const flexVal = numField(shaft.match_flex_value);
    if (flexVal == null) {
      flex = inactive("flex", "SHAFT_FLEX_UNMAPPED");
      considerations.push("SHAFT_FLEX_UNMAPPED");
    } else {
      const gap = rangeGap(
        flexVal,
        req.shaft_flex_min_value,
        req.shaft_flex_max_value
      );
      gaps.flex = gap;
      flex = activeDim("flex", 1, scoreFlex(gap));
    }
  }

  let weight: DimensionTrace;
  if (req.shaft_weight_min_g == null || req.shaft_weight_max_g == null) {
    weight = inactive("weight", "REQUIREMENT_UNRESOLVED");
  } else {
    const wt = numField(shaft.actual_weight_g);
    const wconf = String(shaft.match_weight_confidence || "");
    const weightReliability = evidenceReliability(wconf);
    if (
      wt == null ||
      wconf === "UNRESOLVED" ||
      wconf === "NOT_APPLICABLE" ||
      weightReliability <= 0
    ) {
      weight = inactive("weight", "SHAFT_WEIGHT_UNKNOWN");
      considerations.push("SHAFT_WEIGHT_UNKNOWN");
    } else {
      const gap = rangeGap(wt, req.shaft_weight_min_g, req.shaft_weight_max_g);
      weight = activeDim("weight", weightReliability, scoreWeight(gap));
    }
  }

  let shaft_launch: DimensionTrace;
  if (
    req.shaft_launch_target === "UNRESOLVED" ||
    req.shaft_launch_target_numeric == null
  ) {
    shaft_launch = inactive("shaft_launch", "REQUIREMENT_UNRESOLVED");
  } else if (shaft.match_launch_resolution_status !== "RESOLVED") {
    shaft_launch = inactive("shaft_launch", "SHAFT_LAUNCH_UNRESOLVED");
  } else {
    const val = launchTendencyToNumeric(String(shaft.launch_profile || ""));
    const rel = evidenceReliability(String(shaft.launch_confidence || ""));
    if (val == null || rel <= 0) {
      shaft_launch = inactive("shaft_launch", "SHAFT_LAUNCH_UNRESOLVED");
    } else {
      const gap = Math.abs(val - req.shaft_launch_target_numeric);
      gaps.shaft_launch = gap;
      shaft_launch = activeDim("shaft_launch", rel, scoreLaunch(gap));
    }
  }

  const shaft_spin = inactive("shaft_spin", "SPIN_INACTIVE_V1");

  return {
    dimensions: { flex, weight, shaft_launch, shaft_spin },
    gaps,
    considerations,
  };
}
