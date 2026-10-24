import { describe, expect, it } from "vitest";
import path from "path";
import {
  buildCharacteristicGuidance,
  explainCatalogueHead,
  hasUnresolvedLaunchEquipmentEvidence,
  isMaterialHeadLaunchRequirement,
  loadMatchIntelligence,
  normalizeRequirements,
  rankCatalogueHeads,
  runCatalogueRecommendation,
  scoreCatalogueHead,
  selectCatalogueShortlist,
} from "@/lib/match";
import type { CatalogueHeadScore } from "@/lib/match/catalogue-types";
import { CATALOGUE_RECOMMENDATION_KIND } from "@/lib/match/catalogue-types";
import type { NormalisedRequirements } from "@/lib/match/types";

const REFERENCE = path.join(
  process.cwd(),
  "docs/teevo-match/driver-match-v1.1/reference"
);

function stubScore(
  patch: Partial<CatalogueHeadScore> & { catalogue_key: string }
): CatalogueHeadScore {
  return {
    kind: CATALOGUE_RECOMMENDATION_KIND,
    brand: "Test",
    model: patch.catalogue_key,
    display_name: patch.catalogue_key,
    release_year: 2024,
    excluded: false,
    catalogue_fit_score: 100,
    catalogue_match_band: "EXCELLENT_MATCH",
    suppressed: false,
    scorable: true,
    dimensions: {
      forgiveness: { active: true, nominal_weight: 1, reliability: 1, score: 100 },
      stability: { active: true, nominal_weight: 1, reliability: 1, score: 100 },
      workability: { active: true, nominal_weight: 1, reliability: 1, score: 100 },
      direction: { active: true, nominal_weight: 1, reliability: 1, score: 100 },
      head_launch: { active: true, nominal_weight: 1, reliability: 1, score: 100 },
    },
    guardrail_gaps: {
      direction: null,
      head_launch: null,
      loft: null,
      flex: null,
      shaft_launch: null,
    },
    active_catalogue_dim_count: 5,
    head_recommendation_confidence_score: 90,
    head_recommendation_confidence: "HIGH",
    confidence_components: { golfer: 90, equipment: 90, listing: null },
    considerations: [],
    scope_disclaimer: "MODEL_LEVEL_SUITABILITY_ONLY",
    presentation_chars: {
      directional_bias: "NEUTRAL",
      primary_head_profile: "MAX_FORGIVENESS",
      launch_tendency: "MID",
    },
    ...patch,
  };
}

describe("Phase 2E.1 — material launch requirement", () => {
  const intel = loadMatchIntelligence(REFERENCE);

  it("treats LOW/HIGH trajectory as material; MID-only as not material", () => {
    const low = normalizeRequirements(
      {
        handedness: "RIGHT",
        handicap: 18,
        club_speed_mph: 92,
        typical_trajectory: "LOW",
        primary_objective: "FORGIVENESS",
      },
      intel.headsByKey
    );
    const mid = normalizeRequirements(
      {
        handedness: "RIGHT",
        handicap: 18,
        club_speed_mph: 92,
        typical_trajectory: "MID",
        primary_objective: "FORGIVENESS",
      },
      intel.headsByKey
    );
    const higher = normalizeRequirements(
      {
        handedness: "RIGHT",
        handicap: 15,
        club_speed_mph: 93,
        typical_trajectory: "UNKNOWN",
        primary_objective: "HIGHER_FLIGHT",
      },
      intel.headsByKey
    );
    const unresolved = normalizeRequirements(
      {
        handedness: "RIGHT",
        handicap: 16,
        club_speed_mph: 90,
        typical_trajectory: "UNKNOWN",
        primary_objective: "DISTANCE",
      },
      intel.headsByKey
    );

    expect(isMaterialHeadLaunchRequirement(low)).toBe(true);
    expect(isMaterialHeadLaunchRequirement(mid)).toBe(false);
    expect(isMaterialHeadLaunchRequirement(higher)).toBe(true);
    expect(isMaterialHeadLaunchRequirement(unresolved)).toBe(false);
  });

  it("filters UNKNOWN-launch heads from qualifying pool before B2.1 when launch is material", () => {
    const req = normalizeRequirements(
      {
        handedness: "RIGHT",
        handicap: 28,
        club_speed_mph: 78,
        typical_trajectory: "LOW",
        typical_start_direction: "RIGHT",
        typical_curvature: "RIGHT",
        miss_severity: "LARGE",
        strike_pattern: "HEEL",
        strike_consistency: "LOW",
        primary_objective: "FORGIVENESS",
        current_club_satisfaction: "LOW",
      },
      intel.headsByKey
    );
    expect(isMaterialHeadLaunchRequirement(req)).toBe(true);

    const unknownHead = intel.headsByKey["tour-edge|exotics-max|2026"];
    expect(unknownHead).toBeTruthy();
    const scoredUnknown = scoreCatalogueHead({
      head: unknownHead,
      requirements: req,
      golferConfidence: 80,
    });
    expect(hasUnresolvedLaunchEquipmentEvidence(scoredUnknown)).toBe(true);

    const resolvedLaunchHead = intel.headsByKey["cleveland|launcher-xl-lite-draw|2022"];
    const scoredResolved = scoreCatalogueHead({
      head: resolvedLaunchHead,
      requirements: req,
      golferConfidence: 80,
    });
    expect(scoredResolved.dimensions.head_launch?.active).toBe(true);

    const { recommendations, differentiation_blocked } = rankCatalogueHeads(
      [scoredUnknown, scoredResolved],
      3,
      undefined,
      undefined,
      req
    );
    expect(differentiation_blocked).toBe(false);
    expect(
      recommendations.every((r) => r.catalogue_key !== "tour-edge|exotics-max|2026")
    ).toBe(true);
    expect(
      recommendations.some(
        (r) => r.catalogue_key === "cleveland|launcher-xl-lite-draw|2022"
      )
    ).toBe(true);
  });

  it("does not invent launch-consistency claims when launch is inactive", () => {
    const req = normalizeRequirements(
      {
        handedness: "RIGHT",
        handicap: 18,
        club_speed_mph: 92,
        typical_trajectory: "MID",
        primary_objective: "FORGIVENESS",
      },
      intel.headsByKey
    );
    const scored = scoreCatalogueHead({
      head: intel.headsByKey["tour-edge|exotics-max|2026"],
      requirements: req,
      golferConfidence: 80,
    });
    const exp = explainCatalogueHead(scored, req);
    expect(exp.reasons.every((r) => !/launch tendency is consistent/i.test(r))).toBe(
      true
    );
    expect(
      exp.uncertainty.some((u) => /launch tendency evidence is incomplete/i.test(u))
    ).toBe(true);
  });
});

describe("Phase 2E.1 — soft equal-Fit shortlist", () => {
  it("keeps up to three similar models (no hard clone suppression)", () => {
    const tied = [
      stubScore({
        catalogue_key: "a|one|2022",
        presentation_chars: {
          directional_bias: "STRONG_DRAW",
          primary_head_profile: "DRAW_BIASED",
          launch_tendency: "HIGH",
        },
      }),
      stubScore({
        catalogue_key: "b|two|2022",
        presentation_chars: {
          directional_bias: "STRONG_DRAW",
          primary_head_profile: "DRAW_BIASED",
          launch_tendency: "HIGH",
        },
      }),
      stubScore({
        catalogue_key: "c|three|2020",
        release_year: 2020,
        presentation_chars: {
          directional_bias: "STRONG_DRAW",
          primary_head_profile: "DRAW_BIASED",
          launch_tendency: "HIGH",
        },
      }),
    ];
    const selected = selectCatalogueShortlist(tied, 3);
    expect(selected).toHaveLength(3);
  });

  it("soft-prefers assessed variety within equal Fit without promoting lower Fit", () => {
    const pool = [
      stubScore({
        catalogue_key: "new|draw|2026",
        release_year: 2026,
        presentation_chars: {
          directional_bias: "STRONG_DRAW",
          primary_head_profile: "DRAW_BIASED",
          launch_tendency: "HIGH",
        },
      }),
      stubScore({
        catalogue_key: "new|draw-b|2026",
        release_year: 2026,
        presentation_chars: {
          directional_bias: "STRONG_DRAW",
          primary_head_profile: "DRAW_BIASED",
          launch_tendency: "HIGH",
        },
      }),
      stubScore({
        catalogue_key: "alt|fade|2024",
        release_year: 2024,
        presentation_chars: {
          directional_bias: "FADE",
          primary_head_profile: "PLAYERS",
          launch_tendency: "MID",
        },
      }),
      stubScore({
        catalogue_key: "lower|fit|2025",
        catalogue_fit_score: 90,
        release_year: 2025,
        presentation_chars: {
          directional_bias: "NEUTRAL",
          primary_head_profile: "MAX_FORGIVENESS",
          launch_tendency: "HIGH",
        },
      }),
    ];
    const selected = selectCatalogueShortlist(pool, 3);
    expect(selected).toHaveLength(3);
    expect(selected.every((s) => s.catalogue_fit_score === 100)).toBe(true);
    expect(selected.some((s) => s.catalogue_key === "alt|fade|2024")).toBe(true);
    expect(selected.every((s) => s.catalogue_key !== "lower|fit|2025")).toBe(true);
  });
});

describe("Phase 2E.1 — explain and guidance copy", () => {
  it("pins incomplete coverage and states assessed-scope suitability", () => {
    const req = {
      handedness: "RIGHT",
      head_launch_target: "MID",
      head_launch_target_numeric: 0,
      directional_target_numeric: null,
      forgiveness_requirement: 4,
    } as NormalisedRequirements;
    const score = stubScore({
      catalogue_key: "x|y|2020",
      active_catalogue_dim_count: 3,
      dimensions: {
        forgiveness: { active: true, nominal_weight: 1, reliability: 1, score: 100 },
        stability: { active: true, nominal_weight: 1, reliability: 1, score: 100 },
        workability: { active: true, nominal_weight: 1, reliability: 1, score: 100 },
        direction: {
          active: false,
          nominal_weight: 1,
          reliability: 0,
          score: null,
          omission_reason: "REQUIREMENT_UNRESOLVED",
        },
        head_launch: {
          active: false,
          nominal_weight: 1,
          reliability: 0,
          score: null,
          omission_reason: "EQUIPMENT_EVIDENCE_UNRESOLVED",
        },
      },
    });
    const exp = explainCatalogueHead(score, req);
    expect(exp.suitability_summary).toMatch(/assessed head characteristics/i);
    expect(exp.suitability_summary).toMatch(/not a complete custom club fitting/i);
    expect(exp.uncertainty[0]).toMatch(/Only 3 of 5/);
    expect(
      exp.uncertainty.some((u) => /Launch tendency evidence is incomplete/i.test(u))
    ).toBe(true);
  });

  it("explains crowded B2.1 guidance and nudges existing direction fields", () => {
    const req = {
      handedness: "RIGHT",
      directional_target_numeric: null,
      directional_requirement: "UNRESOLVED",
      head_launch_target: "HIGH",
      preferred_loft_min_deg: null,
      preferred_loft_max_deg: null,
    } as NormalisedRequirements;
    const g = buildCharacteristicGuidance(req, {
      differentiationBlocked: true,
      topTiedFamilyCount: 61,
      topTiedMinActiveDims: 4,
    });
    expect(g.notes[0]).toMatch(/cannot confidently distinguish/i);
    expect(g.notes.some((n) => /typical start direction|typical curve|miss-reduction/i.test(n))).toBe(
      true
    );
  });
});

describe("Phase 2E.1 — live catalogue path smoke", () => {
  const intel = loadMatchIntelligence(REFERENCE);

  it("beginner_forgiveness returns suitable unranked examples when many families tie", () => {
    const result = runCatalogueRecommendation({
      answers: {
        handedness: "RIGHT",
        handicap: 28,
        club_speed_mph: 78,
        typical_trajectory: "LOW",
        typical_start_direction: "RIGHT",
        typical_curvature: "RIGHT",
        miss_severity: "LARGE",
        strike_pattern: "HEEL",
        strike_consistency: "LOW",
        primary_objective: "FORGIVENESS",
        current_club_satisfaction: "LOW",
      },
      intelligence: intel,
      inventory: [],
    });
    expect(result.mode).toBe("CHARACTERISTIC_GUIDANCE");
    expect(result.recommendations).toEqual([]);
    expect(result.example_heads?.length).toBeGreaterThan(0);
    expect(result.example_heads?.length).toBeLessThanOrEqual(3);
    expect(result.presentation_choices).toBeUndefined();
    expect(
      result.example_heads?.every(
        (r) => !hasUnresolvedLaunchEquipmentEvidence(r)
      )
    ).toBe(true);
    expect(result.explanations[0].suitability_summary).toMatch(
      /assessed head characteristics/i
    );
  });
});
