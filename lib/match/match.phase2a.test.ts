import { describe, expect, it } from "vitest";
import path from "path";
import {
  CATALOGUE_MIN_INDEPENDENT_ACTIVE_DIMS,
  CATALOGUE_RECOMMENDATION_KIND,
  compareCataloguePresentationOrder,
  lacksMeaningfulHeadDifferentiation,
  loadMatchIntelligence,
  rankCatalogueHeads,
  runCatalogueRecommendation,
  scoreCatalogueHead,
  scoreCandidate,
  validateMatchQuestionnaireInputs,
} from "@/lib/match";
import type { CatalogueHeadScore } from "@/lib/match/catalogue-types";
import type { NormalisedRequirements } from "@/lib/match/types";

const REFERENCE = path.join(
  process.cwd(),
  "docs/teevo-match/driver-match-v1.1/reference"
);

const RICH_ANSWERS = {
  handedness: "RIGHT",
  handicap: 10,
  club_speed_mph: 95,
  carry_distance_yards: null,
  typical_trajectory: "MID",
  typical_start_direction: "RIGHT",
  typical_curvature: "RIGHT",
  miss_severity: "LARGE",
  strike_pattern: "CENTRE",
  strike_consistency: "MEDIUM",
  primary_objective: "DISTANCE",
  current_loft_deg: null,
  current_club_satisfaction: "UNKNOWN",
  budget_max_gbp: 250,
};

const SPARSE_INCOMPLETE = {
  handedness: "RIGHT",
  handicap: 14,
  typical_trajectory: "UNKNOWN",
  typical_start_direction: "UNKNOWN",
  typical_curvature: "UNKNOWN",
  miss_severity: "UNKNOWN",
  strike_pattern: "UNKNOWN",
  strike_consistency: "UNKNOWN",
  primary_objective: "DISTANCE",
  current_club_satisfaction: "UNKNOWN",
};

/** Direction unresolved, launch present — may still name heads if Fit ladder exists. */
const BORDERLINE_FORGIVENESS = {
  handedness: "RIGHT",
  handicap: 18,
  club_speed_mph: 92,
  typical_trajectory: "MID",
  typical_start_direction: "CENTRE",
  typical_curvature: "VARIABLE",
  miss_severity: "MODERATE",
  strike_pattern: "HEEL",
  strike_consistency: "LOW",
  primary_objective: "FORGIVENESS",
  current_club_satisfaction: "LOW",
};

function sparseReq(
  patch: Partial<NormalisedRequirements> = {}
): NormalisedRequirements {
  return {
    handedness: "RIGHT",
    recommendation_intent: "UNANCHORED",
    head_launch_target: "MID",
    head_launch_target_numeric: 0,
    head_spin_target: "UNRESOLVED",
    forgiveness_requirement: 3.75,
    stability_requirement: 4,
    directional_target_numeric: 2,
    directional_requirement: "STRONG_DRAW_ASSIST",
    workability_preference: 2,
    driver_subtype_allowed: "STANDARD",
    preferred_loft_min_deg: 9,
    preferred_loft_max_deg: 11.5,
    shaft_weight_min_g: 50,
    shaft_weight_max_g: 65,
    shaft_flex_min_value: 2,
    shaft_flex_max_value: 3,
    shaft_launch_target: "MID",
    shaft_launch_target_numeric: 0,
    shaft_spin_target: "UNRESOLVED",
    shaft_torque_target_deg: null,
    conflict_flags: [],
    requirement_confidence:
      {} as NormalisedRequirements["requirement_confidence"],
    ...patch,
  };
}

function stubScore(
  patch: Partial<CatalogueHeadScore> & { catalogue_key: string }
): CatalogueHeadScore {
  return {
    kind: CATALOGUE_RECOMMENDATION_KIND,
    brand: "Test",
    model: patch.catalogue_key,
    display_name: patch.catalogue_key,
    release_year: null,
    excluded: false,
    catalogue_fit_score: 90,
    catalogue_match_band: "EXCELLENT_MATCH",
    suppressed: false,
    scorable: true,
    dimensions: {},
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
    ...patch,
  };
}

describe("Phase 2A Checkpoint A — validation", () => {
  it("requires handedness", () => {
    const r = validateMatchQuestionnaireInputs({
      ...RICH_ANSWERS,
      handedness: null,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.includes("handedness"))).toBe(true);
  });

  it("accepts rich answers", () => {
    const r = validateMatchQuestionnaireInputs(RICH_ANSWERS);
    expect(r.ok).toBe(true);
  });
});

describe("Phase 2A — presentation tie-break (exact Fit only)", () => {
  it("prefers newer release_year on exact Fit + same band without changing Fit", () => {
    const older = stubScore({
      catalogue_key: "brand|old|2012",
      catalogue_fit_score: 89.63414634146342,
      release_year: 2012,
    });
    const newer = stubScore({
      catalogue_key: "brand|new|2023",
      catalogue_fit_score: 89.63414634146342,
      release_year: 2023,
    });
    expect(compareCataloguePresentationOrder(newer, older)).toBeLessThan(0);
    expect(older.catalogue_fit_score).toBe(newer.catalogue_fit_score);
    const { recommendations } = rankCatalogueHeads([older, newer], 3);
    expect(recommendations.map((r) => r.catalogue_key)).toEqual([
      "brand|new|2023",
      "brand|old|2012",
    ]);
  });

  it("does not treat near-ties as ties", () => {
    const a = stubScore({
      catalogue_key: "a",
      catalogue_fit_score: 90,
      release_year: 2010,
    });
    const b = stubScore({
      catalogue_key: "b",
      catalogue_fit_score: 90.05,
      release_year: 2024,
    });
    expect(compareCataloguePresentationOrder(b, a)).toBeLessThan(0);
  });

  it("uses catalogue_key when year and Fit are equal", () => {
    const a = stubScore({
      catalogue_key: "aaa|x|2020",
      catalogue_fit_score: 91,
      release_year: 2020,
    });
    const b = stubScore({
      catalogue_key: "zzz|x|2020",
      catalogue_fit_score: 91,
      release_year: 2020,
    });
    expect(compareCataloguePresentationOrder(a, b)).toBeLessThan(0);
  });
});

describe("Phase 2A — B2.1 differentiation gate", () => {
  it("allows ≤3 top-tied families under incomplete coverage", () => {
    expect(
      lacksMeaningfulHeadDifferentiation({
        top_tied_family_count: 3,
        top_tied_min_active_dims: 4,
      })
    ).toBe(false);
  });

  it("blocks >3 top-tied families when any top-tied winner has incomplete coverage", () => {
    expect(
      lacksMeaningfulHeadDifferentiation({
        top_tied_family_count: 25,
        top_tied_min_active_dims: 4,
      })
    ).toBe(true);
  });

  it("allows >3 top-tied families only when every winner has 5 dims", () => {
    expect(
      lacksMeaningfulHeadDifferentiation({
        top_tied_family_count: 25,
        top_tied_min_active_dims: 5,
      })
    ).toBe(false);
  });

  it("blocks mixed coverage where max is 5 but min is below 5", () => {
    expect(
      lacksMeaningfulHeadDifferentiation({
        top_tied_family_count: 20,
        top_tied_min_active_dims: 3,
      })
    ).toBe(true);
  });

  it("does not use distinct lower tiers as an allow condition", () => {
    expect(
      lacksMeaningfulHeadDifferentiation({
        top_tied_family_count: 4,
        top_tied_min_active_dims: 4,
      })
    ).toBe(true);
  });
});

describe("Phase 2A Checkpoint A — catalogue scoring", () => {
  const intel = loadMatchIntelligence(REFERENCE);

  it("omits loft and shaft dimensions and separates type from listing scores", () => {
    const head = intel.eligibleHeads[0];
    const scored = scoreCatalogueHead({
      head,
      requirements: sparseReq(),
      golferConfidence: 80,
    });
    expect(scored.kind).toBe(CATALOGUE_RECOMMENDATION_KIND);
    expect(scored.release_year == null || typeof scored.release_year === "number").toBe(
      true
    );
    expect(scored.dimensions.loft?.omission_reason).toBe(
      "CATALOGUE_NO_CONFIGURATION"
    );
    expect("listing_id" in scored).toBe(false);
  });

  it("does not treat listing CandidateScore as catalogue score", () => {
    const head =
      intel.headsByKey["taylormade|qi10|2024"] ?? intel.eligibleHeads[0];
    const shaft = intel.matchEligibleShafts[0];
    const listingScore = scoreCandidate({
      listing: {
        listing_id: "L1",
        head_key: String(head.catalogue_key),
        shaft_key: String(shaft.shaft_key),
        handedness: "RIGHT",
        stated_loft_deg: 10.5,
        publicly_purchasable: true,
        price_gbp: 200,
      },
      requirements: sparseReq(),
      head,
      shaft,
      golferConfidence: 80,
    });
    const cat = scoreCatalogueHead({
      head,
      requirements: sparseReq(),
      golferConfidence: 80,
    });
    expect(listingScore.listing_id).toBe("L1");
    expect(cat.kind).toBe(CATALOGUE_RECOMMENDATION_KIND);
    if (listingScore.raw_fit_score != null && cat.catalogue_fit_score != null) {
      expect(cat.catalogue_fit_score).not.toBe(listingScore.raw_fit_score);
    }
  });

  it("sparse: handedness-only → characteristic guidance", () => {
    const result = runCatalogueRecommendation({
      skipUkMarketGate: true,
      answers: { handedness: "RIGHT" },
      intelligence: intel,
    });
    expect(result.mode).toBe("CHARACTERISTIC_GUIDANCE");
    expect(result.recommendations).toEqual([]);
    expect(result.audit.insufficient_evidence_reason).toBe(
      "INSUFFICIENT_EVIDENCE_BACKED_REQUIREMENT_DIMS"
    );
  });

  it("sparse incomplete swing: characteristic guidance via differentiation gate", () => {
    const result = runCatalogueRecommendation({
      skipUkMarketGate: true,
      answers: SPARSE_INCOMPLETE,
      intelligence: intel,
    });
    expect(result.mode).toBe("CHARACTERISTIC_GUIDANCE");
    expect(result.recommendations).toEqual([]);
    expect(result.audit.insufficient_evidence_reason).toBe(
      "NO_MEANINGFUL_HEAD_DIFFERENTIATION"
    );
    expect(result.audit.max_active_catalogue_dims).toBeLessThan(5);
    expect(result.audit.top_fit_share_count).toBeGreaterThan(3);
  });

  it("rich inputs → named heads with qualified explanations", () => {
    const result = runCatalogueRecommendation({
      skipUkMarketGate: true,
      answers: RICH_ANSWERS,
      intelligence: intel,
    });
    expect(result.mode).toBe("NAMED_HEADS");
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeLessThanOrEqual(3);
    for (const r of result.recommendations) {
      expect(r.active_catalogue_dim_count).toBeGreaterThanOrEqual(
        CATALOGUE_MIN_INDEPENDENT_ACTIVE_DIMS
      );
    }
    const exp = result.explanations[0];
    expect(exp.suitability_summary.toLowerCase()).toMatch(/not a purchase|loft\/shaft/);
    expect(exp.trade_offs.some((t) => /loft|shaft|model-level/i.test(t))).toBe(
      true
    );
  });

  it("borderline forgiveness (direction unresolved) does not auto-suppress", () => {
    const result = runCatalogueRecommendation({
      skipUkMarketGate: true,
      answers: BORDERLINE_FORGIVENESS,
      intelligence: intel,
    });
    // May be NAMED_HEADS (Fit ladder) or CHARACTERISTIC_GUIDANCE (flat partial pool).
    expect(["NAMED_HEADS", "CHARACTERISTIC_GUIDANCE", "NO_DEFENSIBLE_HEADS"]).toContain(
      result.mode
    );
    if (result.mode === "CHARACTERISTIC_GUIDANCE") {
      expect(result.audit.insufficient_evidence_reason).not.toBe(
        "INSUFFICIENT_EVIDENCE_BACKED_REQUIREMENT_DIMS"
      );
    }
    if (result.mode === "NAMED_HEADS") {
      expect(result.audit.distinct_fit_scores).toBeGreaterThanOrEqual(1);
      expect(result.recommendations.length).toBeGreaterThan(0);
    }
  });

  it("is deterministic for identical rich inputs", () => {
    const a = runCatalogueRecommendation({
      skipUkMarketGate: true,
      answers: RICH_ANSWERS,
      intelligence: intel,
    });
    const b = runCatalogueRecommendation({
      skipUkMarketGate: true,
      answers: RICH_ANSWERS,
      intelligence: intel,
    });
    expect(a.recommendations.map((r) => r.catalogue_key)).toEqual(
      b.recommendations.map((r) => r.catalogue_key)
    );
    expect(a.recommendations.map((r) => r.catalogue_fit_score)).toEqual(
      b.recommendations.map((r) => r.catalogue_fit_score)
    );
  });

  it("never pads rankCatalogueHeads to three", () => {
    const { recommendations, differentiation_blocked } = rankCatalogueHeads(
      [
        stubScore({
          catalogue_key: "only|one|2024",
          catalogue_fit_score: 90,
          release_year: 2024,
          active_catalogue_dim_count: 5,
        }),
      ],
      3
    );
    expect(differentiation_blocked).toBe(false);
    expect(recommendations.length).toBe(1);
  });

  it("does not suppress informative 5-dim profiles solely because Fits tie", () => {
    const tied = [
      stubScore({
        catalogue_key: "brand|a|2020",
        catalogue_fit_score: 92,
        release_year: 2020,
        active_catalogue_dim_count: 5,
      }),
      stubScore({
        catalogue_key: "brand|b|2024",
        catalogue_fit_score: 92,
        release_year: 2024,
        active_catalogue_dim_count: 5,
      }),
      stubScore({
        catalogue_key: "brand|c|2022",
        catalogue_fit_score: 92,
        release_year: 2022,
        active_catalogue_dim_count: 5,
      }),
      stubScore({
        catalogue_key: "brand|d|2021",
        catalogue_fit_score: 92,
        release_year: 2021,
        active_catalogue_dim_count: 5,
      }),
    ];
    const { recommendations, differentiation_blocked, stats } =
      rankCatalogueHeads(tied, 3);
    expect(differentiation_blocked).toBe(false);
    expect(stats.distinct_fit_scores).toBe(1);
    expect(stats.max_active_catalogue_dims).toBe(5);
    expect(stats.top_fit_share_count).toBe(4);
    expect(recommendations.map((r) => r.catalogue_key)).toEqual([
      "brand|b|2024",
      "brand|c|2022",
      "brand|d|2021",
    ]);
  });

  it("logs differentiation suppression reason for sparse incomplete profiles", () => {
    const result = runCatalogueRecommendation({
      skipUkMarketGate: true,
      answers: SPARSE_INCOMPLETE,
      intelligence: intel,
    });
    expect(result.mode).toBe("CHARACTERISTIC_GUIDANCE");
    expect(result.audit.insufficient_evidence_reason).toBe(
      "NO_MEANINGFUL_HEAD_DIFFERENTIATION"
    );
    expect(result.audit.qualifying_heads).toBeGreaterThan(0);
    expect(result.audit.max_active_catalogue_dims).toBeLessThan(5);
    expect(result.audit.top_fit_share_count).toBeGreaterThan(3);
  });
});
