import path from "path";
import { describe, expect, it } from "vitest";
import { evidenceReliability } from "@/lib/match/category";
import { loadMatchIntelligence } from "@/lib/match/intelligence/load";
import { normalizeRequirements } from "@/lib/match/requirements";
import { scoreCandidate } from "@/lib/match/scoring/candidate";

const REFERENCE = path.join(
  process.cwd(),
  "docs/teevo-match/driver-match-v1.1/reference"
);

describe("SHAFT_V1 scoring guards stay equivalent on the frozen eligible set", () => {
  const intel = loadMatchIntelligence(REFERENCE);
  const requirements = normalizeRequirements(
    {
      handedness: "RIGHT",
      handicap: 10,
      club_speed_mph: 95,
      typical_trajectory: "MID",
      typical_start_direction: "CENTRE",
      typical_curvature: "STRAIGHT",
      miss_severity: "MODERATE",
      strike_pattern: "CENTRE",
      strike_consistency: "MEDIUM",
      primary_objective: "DISTANCE",
      current_club_satisfaction: "UNKNOWN",
    },
    intel.headsByKey
  );
  const head = intel.headsByKey["adams|blue|2015"];

  it("does not change flex or weight activity for any current eligible shaft", () => {
    expect(requirements.shaft_flex_min_value).not.toBeNull();
    expect(requirements.shaft_weight_min_g).not.toBeNull();
    expect(intel.matchEligibleShafts.length).toBe(2394);

    for (const shaft of intel.matchEligibleShafts) {
      const status = String(shaft.match_flex_mapping_status || "");
      const flexValue =
        shaft.match_flex_value == null || shaft.match_flex_value === ""
          ? null
          : Number(shaft.match_flex_value);
      const legacyFlexActive =
        status !== "UNMAPPED_TO_NORMALISED_FLEX" &&
        flexValue != null &&
        Number.isFinite(flexValue);
      const guardedFlexActive =
        status === "MAPPED" && flexValue != null && Number.isFinite(flexValue);
      expect(guardedFlexActive).toBe(legacyFlexActive);

      const wconf = String(shaft.match_weight_confidence || "");
      const weight = Number(shaft.actual_weight_g);
      const hasWeight = Number.isFinite(weight);
      const legacyWeightActive =
        hasWeight && wconf !== "UNRESOLVED" && wconf !== "NOT_APPLICABLE";
      const guardedReliability = evidenceReliability(wconf);
      const guardedWeightActive =
        hasWeight &&
        wconf !== "UNRESOLVED" &&
        wconf !== "NOT_APPLICABLE" &&
        guardedReliability > 0;
      expect(guardedWeightActive).toBe(legacyWeightActive);
      if (guardedWeightActive) {
        expect(guardedReliability).toBe(evidenceReliability(wconf) || 1);
      }

      const scored = scoreCandidate({
        listing: {
          listing_id: `census-${shaft.shaft_key}`,
          head_key: "adams|blue|2015",
          shaft_key: String(shaft.shaft_key),
          handedness: "RIGHT",
          stated_loft_deg: 10.5,
          publicly_purchasable: true,
          price_gbp: 200,
        },
        requirements,
        head,
        shaft,
        golferConfidence: 80,
      });
      if (scored.excluded || !scored.dimensions) continue;
      expect(scored.dimensions.flex.active).toBe(guardedFlexActive);
      expect(scored.dimensions.weight.active).toBe(guardedWeightActive);
      if (scored.dimensions.weight.active) {
        expect(scored.dimensions.weight.reliability).toBe(guardedReliability);
      }
    }
  });
});
