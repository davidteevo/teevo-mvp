import { describe, expect, it } from "vitest";
import path from "path";
import {
  attachInventoryToCatalogueRecommendations,
  compareCataloguePresentationOrder,
  dedupeByRecommendationFamily,
  familyKeyFor,
  isRecommendationEligible,
  loadHeadConfigOverlay,
  loadMatchIntelligence,
  MATCH_HEAD_CONFIG_OVERLAY_VERSION,
  rankCatalogueHeads,
  runCatalogueRecommendation,
} from "@/lib/match";
import type { CatalogueHeadScore } from "@/lib/match/catalogue-types";
import type { MatchInventoryItem } from "@/lib/match/inventory/types";
import type { NormalisedRequirements } from "@/lib/match/types";
import { writeFileSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const REFERENCE = path.join(
  process.cwd(),
  "docs/teevo-match/driver-match-v1.1/reference"
);

const FAMILY = {
  g430Max: "ping|g430-max|2023",
  g430Hl: "ping|g430-max-hl|2023",
  g430Max10k: "ping|g430-max-10k|2024",
  g440Max: "ping|g440-max|2025",
  g440MaxHl: "ping|g440-max-hl|2025",
  g440K: "ping|g440-k|2026",
  g440KHl: "ping|g440-k-hl|2026",
  qi10Max: "taylormade|qi10-max|2024",
  qi10MaxHl: "taylormade|qi10-max-hl|2024",
} as const;

function stubScore(
  patch: Partial<CatalogueHeadScore> & { catalogue_key: string }
): CatalogueHeadScore {
  const {
    catalogue_key,
    brand,
    model,
    display_name,
    release_year,
    catalogue_fit_score,
    catalogue_match_band,
    active_catalogue_dim_count,
    ...rest
  } = patch;
  return {
    kind: "CATALOGUE_HEAD_SUITABILITY",
    catalogue_key,
    brand: brand ?? "Brand",
    model: model ?? catalogue_key,
    display_name: display_name ?? catalogue_key,
    release_year: release_year ?? 2024,
    excluded: false,
    catalogue_fit_score: catalogue_fit_score ?? 90,
    catalogue_match_band: catalogue_match_band ?? "EXCELLENT_MATCH",
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
    active_catalogue_dim_count: active_catalogue_dim_count ?? 5,
    head_recommendation_confidence_score: 0.8,
    head_recommendation_confidence: "HIGH",
    confidence_components: { golfer: 0.8, equipment: 0.8, listing: null },
    considerations: [],
    scope_disclaimer: "MODEL_LEVEL_SUITABILITY_ONLY",
    ...rest,
  };
}

function sparseReq(
  patch: Partial<NormalisedRequirements> = {}
): NormalisedRequirements {
  return {
    handedness: "RIGHT",
    recommendation_intent: "UNANCHORED",
    head_launch_target: "MID",
    head_launch_target_numeric: 0,
    head_spin_target: "UNRESOLVED",
    forgiveness_requirement: 4,
    stability_requirement: 4,
    directional_target_numeric: 0,
    directional_requirement: "NEUTRAL",
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

describe("MATCH_HEAD_CONFIG_OVERLAY_V1", () => {
  const intel = loadMatchIntelligence(REFERENCE);
  const overlay = loadHeadConfigOverlay(REFERENCE, intel);

  it("loads the eight verified mappings against frozen heads", () => {
    expect(overlay.version).toBe(MATCH_HEAD_CONFIG_OVERLAY_VERSION);
    expect(overlay.byCatalogueKey.size).toBe(8);
    for (const key of Object.values(FAMILY)) {
      if (key === FAMILY.g430Max10k) continue;
      expect(intel.headsByKey[key]).toBeTruthy();
    }
    expect(intel.headsByKey[FAMILY.g430Max10k]).toBeTruthy();
    expect(familyKeyFor(FAMILY.g430Hl, overlay)).toBe(FAMILY.g430Max);
    expect(familyKeyFor(FAMILY.g440MaxHl, overlay)).toBe(FAMILY.g440Max);
    expect(familyKeyFor(FAMILY.g440KHl, overlay)).toBe(FAMILY.g440K);
    expect(familyKeyFor(FAMILY.qi10MaxHl, overlay)).toBe(FAMILY.qi10Max);
    expect(isRecommendationEligible(FAMILY.qi10MaxHl, overlay)).toBe(false);
    expect(isRecommendationEligible(FAMILY.g430Hl, overlay)).toBe(false);
    expect(isRecommendationEligible(FAMILY.g440MaxHl, overlay)).toBe(false);
    expect(isRecommendationEligible(FAMILY.g440KHl, overlay)).toBe(false);
    expect(overlay.byCatalogueKey.get(FAMILY.g430Hl)?.hold_reason).toBe(
      "HL_COMPLETE_BUILD_NOT_HEAD_ISOLATED"
    );
    expect(overlay.byCatalogueKey.get(FAMILY.qi10MaxHl)?.hold_reason).toBe(
      "UK_UNVERIFIED"
    );
  });

  it("fails closed when overlay references a missing catalogue key", () => {
    const dir = mkdtempSync(join(tmpdir(), "teevo-overlay-"));
    writeFileSync(
      join(dir, "head-config-overlay.v1.json"),
      JSON.stringify({
        overlay_version: MATCH_HEAD_CONFIG_OVERLAY_VERSION,
        intelligence_heads_ref: "DRIVER_V1_2026-10-16",
        members: [
          {
            catalogue_key: "missing|head|2099",
            recommendation_family_key: "missing|head|2099",
            canonical_catalogue_key: "missing|head|2099",
            build_id: "STANDARD",
            source_status: "VERIFIED",
            recommendation_eligible: true,
            hold_reason: null,
          },
        ],
      })
    );
    expect(() => loadHeadConfigOverlay(dir, intel)).toThrow(
      /unknown catalogue_key/
    );
  });

  it("skips held HL and keeps canonical sibling as the family winner", () => {
    const ordered = [
      stubScore({ catalogue_key: FAMILY.g430Hl, catalogue_fit_score: 95 }),
      stubScore({ catalogue_key: FAMILY.g430Max, catalogue_fit_score: 94 }),
    ].sort(compareCataloguePresentationOrder);
    const result = dedupeByRecommendationFamily(ordered, overlay, 3);
    expect(result.recommendations.map((r) => r.catalogue_key)).toEqual([
      FAMILY.g430Max,
    ]);
  });

  it("dedupes G440 MAX / HL and G440 K / HL as separate families", () => {
    const ordered = [
      stubScore({ catalogue_key: FAMILY.g440Max, catalogue_fit_score: 93 }),
      stubScore({ catalogue_key: FAMILY.g440MaxHl, catalogue_fit_score: 99 }),
      stubScore({ catalogue_key: FAMILY.g440K, catalogue_fit_score: 91 }),
      stubScore({ catalogue_key: FAMILY.g440KHl, catalogue_fit_score: 98 }),
    ].sort(compareCataloguePresentationOrder);
    const result = dedupeByRecommendationFamily(ordered, overlay, 3);
    expect(result.recommendations.map((r) => r.catalogue_key)).toEqual([
      FAMILY.g440Max,
      FAMILY.g440K,
    ]);
    expect(result.qualifying_families_after_dedupe).toBe(2);
  });

  it("keeps G430 Max 10K independent from G430 Max / HL", () => {
    expect(familyKeyFor(FAMILY.g430Max10k, overlay)).toBe(FAMILY.g430Max10k);
    const ordered = [
      stubScore({
        catalogue_key: FAMILY.g430Max,
        catalogue_fit_score: 92,
        release_year: 2023,
      }),
      stubScore({
        catalogue_key: FAMILY.g430Hl,
        catalogue_fit_score: 99,
        release_year: 2023,
      }),
      stubScore({
        catalogue_key: FAMILY.g430Max10k,
        catalogue_fit_score: 92,
        release_year: 2024,
      }),
    ].sort(compareCataloguePresentationOrder);
    const result = dedupeByRecommendationFamily(ordered, overlay, 3);
    expect(result.recommendations.map((r) => r.catalogue_key).sort()).toEqual(
      [FAMILY.g430Max, FAMILY.g430Max10k].sort()
    );
  });

  it("holds all four HL configs so they cannot win recommendation cards", () => {
    for (const hl of [
      FAMILY.g430Hl,
      FAMILY.g440MaxHl,
      FAMILY.g440KHl,
      FAMILY.qi10MaxHl,
    ]) {
      expect(isRecommendationEligible(hl, overlay)).toBe(false);
    }
    const ordered = [
      stubScore({ catalogue_key: FAMILY.qi10MaxHl, catalogue_fit_score: 99 }),
      stubScore({ catalogue_key: FAMILY.qi10Max, catalogue_fit_score: 80 }),
    ].sort(compareCataloguePresentationOrder);
    const result = dedupeByRecommendationFamily(ordered, overlay, 3);
    expect(result.recommendations.map((r) => r.catalogue_key)).toEqual([
      FAMILY.qi10Max,
    ]);
  });

  it("returns held-HL-only family as empty contribution", () => {
    const ordered = [
      stubScore({ catalogue_key: FAMILY.g430Hl, catalogue_fit_score: 95 }),
      stubScore({ catalogue_key: FAMILY.qi10MaxHl, catalogue_fit_score: 94 }),
    ];
    const result = dedupeByRecommendationFamily(ordered, overlay, 3);
    expect(result.recommendations).toEqual([]);
    expect(result.qualifying_families_after_dedupe).toBe(0);
  });

  it("does not suppress distinct families with identical Fit scores", () => {
    const ordered = [
      stubScore({
        catalogue_key: FAMILY.g430Max,
        catalogue_fit_score: 90,
        release_year: 2023,
      }),
      stubScore({
        catalogue_key: FAMILY.g440Max,
        catalogue_fit_score: 90,
        release_year: 2025,
      }),
      stubScore({
        catalogue_key: FAMILY.g440K,
        catalogue_fit_score: 90,
        release_year: 2026,
      }),
    ].sort(compareCataloguePresentationOrder);
    const result = dedupeByRecommendationFamily(ordered, overlay, 3);
    expect(result.recommendations).toHaveLength(3);
    expect(result.family_duplicates_suppressed).toBe(0);
  });

  it("returns two when only two qualifying families exist", () => {
    const ordered = [
      stubScore({ catalogue_key: FAMILY.g430Max, catalogue_fit_score: 91 }),
      stubScore({ catalogue_key: FAMILY.g430Hl, catalogue_fit_score: 90 }),
      stubScore({ catalogue_key: FAMILY.g440Max, catalogue_fit_score: 89 }),
      stubScore({ catalogue_key: FAMILY.g440MaxHl, catalogue_fit_score: 88 }),
    ].sort(compareCataloguePresentationOrder);
    const result = dedupeByRecommendationFamily(ordered, overlay, 3);
    expect(result.recommendations).toHaveLength(2);
  });

  it("leaves unmapped heads as their own family", () => {
    expect(familyKeyFor("callaway|rogue-st-max|2022", overlay)).toBe(
      "callaway|rogue-st-max|2022"
    );
    expect(isRecommendationEligible("callaway|rogue-st-max|2022", overlay)).toBe(
      true
    );
  });

  describe("B2.1 top-tied family differentiation", () => {
    function nFamilies(
      n: number,
      patch: Partial<CatalogueHeadScore> & {
        catalogue_fit_score: number;
        active_catalogue_dim_count: number;
      }
    ): CatalogueHeadScore[] {
      return Array.from({ length: n }, (_, i) =>
        stubScore({
          catalogue_key: `brand|model-${String(i).padStart(2, "0")}|2020`,
          release_year: 2020,
          ...patch,
        })
      );
    }

    it("1. three families tied at top with four dims — allow", () => {
      const scored = nFamilies(3, {
        catalogue_fit_score: 90,
        active_catalogue_dim_count: 4,
      });
      const { recommendations, differentiation_blocked, family_stats } =
        rankCatalogueHeads(scored, 3, overlay);
      expect(differentiation_blocked).toBe(false);
      expect(recommendations).toHaveLength(3);
      expect(family_stats.top_tied_family_count).toBe(3);
    });

    it("2. twenty-five families tied at top with four dims, no lower — block", () => {
      const scored = nFamilies(25, {
        catalogue_fit_score: 90,
        active_catalogue_dim_count: 4,
      });
      const { recommendations, differentiation_blocked, family_stats } =
        rankCatalogueHeads(scored, 3, overlay);
      expect(differentiation_blocked).toBe(true);
      expect(recommendations).toEqual([]);
      expect(family_stats.top_tied_family_count).toBe(25);
      expect(family_stats.top_tied_max_active_dims).toBe(4);
    });

    it("3. twenty-five top-tied with four dims AND lower-scoring families — block", () => {
      const scored = [
        ...nFamilies(25, {
          catalogue_fit_score: 90,
          active_catalogue_dim_count: 4,
        }),
        ...Array.from({ length: 5 }, (_, i) =>
          stubScore({
            catalogue_key: `lower|m-${i}|2018`,
            catalogue_fit_score: 80 - i,
            active_catalogue_dim_count: 4,
            release_year: 2018,
          })
        ),
      ];
      // Many distinct Fits must not bypass B2.1.
      const { recommendations, differentiation_blocked, stats } =
        rankCatalogueHeads(scored, 3, overlay);
      expect(stats.distinct_fit_scores).toBeGreaterThan(1);
      expect(differentiation_blocked).toBe(true);
      expect(recommendations).toEqual([]);
    });

    it("4. four families tied at top with four dims — block", () => {
      const scored = [
        ...nFamilies(4, {
          catalogue_fit_score: 92,
          active_catalogue_dim_count: 4,
        }),
        stubScore({
          catalogue_key: "lower|x|2015",
          catalogue_fit_score: 70,
          active_catalogue_dim_count: 4,
        }),
      ];
      const { differentiation_blocked, family_stats } = rankCatalogueHeads(
        scored,
        3,
        overlay
      );
      expect(family_stats.top_tied_family_count).toBe(4);
      expect(differentiation_blocked).toBe(true);
    });

    it("5. three families tied at top with lower-scoring families — allow", () => {
      const scored = [
        ...nFamilies(3, {
          catalogue_fit_score: 91,
          active_catalogue_dim_count: 4,
        }),
        stubScore({
          catalogue_key: "lower|y|2016",
          catalogue_fit_score: 70,
          active_catalogue_dim_count: 4,
        }),
      ];
      const { recommendations, differentiation_blocked } = rankCatalogueHeads(
        scored,
        3,
        overlay
      );
      expect(differentiation_blocked).toBe(false);
      expect(recommendations).toHaveLength(3);
    });

    it("6. duplicate HL/base configs count distinct selectable families", () => {
      const scored = [
        stubScore({
          catalogue_key: FAMILY.g430Max,
          catalogue_fit_score: 90,
          active_catalogue_dim_count: 4,
        }),
        stubScore({
          catalogue_key: FAMILY.g430Hl,
          catalogue_fit_score: 90,
          active_catalogue_dim_count: 4,
        }),
        stubScore({
          catalogue_key: FAMILY.g440Max,
          catalogue_fit_score: 90,
          active_catalogue_dim_count: 4,
        }),
        stubScore({
          catalogue_key: FAMILY.g440MaxHl,
          catalogue_fit_score: 90,
          active_catalogue_dim_count: 4,
        }),
        stubScore({
          catalogue_key: FAMILY.g440K,
          catalogue_fit_score: 90,
          active_catalogue_dim_count: 4,
        }),
        stubScore({
          catalogue_key: FAMILY.g440KHl,
          catalogue_fit_score: 90,
          active_catalogue_dim_count: 4,
        }),
      ];
      const { recommendations, differentiation_blocked, family_stats } =
        rankCatalogueHeads(scored, 3, overlay);
      expect(differentiation_blocked).toBe(false);
      expect(family_stats.top_tied_family_count).toBe(3);
      expect(recommendations).toHaveLength(3);
      expect(
        recommendations.every((r) => isRecommendationEligible(r.catalogue_key, overlay))
      ).toBe(true);
    });

    it("7. lower-ranked 5-dim candidates cannot override inadequate top-tied coverage", () => {
      const scored = [
        ...nFamilies(5, {
          catalogue_fit_score: 95,
          active_catalogue_dim_count: 4,
        }),
        stubScore({
          catalogue_key: "deep|covered|2019",
          catalogue_fit_score: 70,
          active_catalogue_dim_count: 5,
        }),
      ];
      const { differentiation_blocked, family_stats } = rankCatalogueHeads(
        scored,
        3,
        overlay
      );
      expect(family_stats.top_tied_max_active_dims).toBe(4);
      expect(differentiation_blocked).toBe(true);
    });

    it("8. twenty-five top-tied with five dims — no unique Best Match", () => {
      const scored = nFamilies(25, {
        catalogue_fit_score: 90,
        active_catalogue_dim_count: 5,
      });
      const { recommendations, differentiation_blocked, family_stats } =
        rankCatalogueHeads(scored, 3, overlay);
      expect(differentiation_blocked).toBe(true);
      expect(family_stats.top_tied_family_count).toBe(25);
      expect(family_stats.top_tied_min_active_dims).toBe(5);
      expect(recommendations).toEqual([]);
    });

    it("mixed coverage: one 5-dim among twenty 3-dim top-tied — block", () => {
      const scored = [
        stubScore({
          catalogue_key: "brand|full|2024",
          catalogue_fit_score: 90,
          active_catalogue_dim_count: 5,
          release_year: 2024,
        }),
        ...nFamilies(19, {
          catalogue_fit_score: 90,
          active_catalogue_dim_count: 3,
        }),
      ];
      const { recommendations, differentiation_blocked, family_stats } =
        rankCatalogueHeads(scored, 3, overlay);
      expect(family_stats.top_tied_family_count).toBe(20);
      expect(family_stats.top_tied_max_active_dims).toBe(5);
      expect(family_stats.top_tied_min_active_dims).toBe(3);
      expect(differentiation_blocked).toBe(true);
      expect(recommendations).toEqual([]);
    });

    it("mixed coverage: mix of four and five dims among crowded ties — block", () => {
      const scored = [
        ...nFamilies(10, {
          catalogue_fit_score: 91,
          active_catalogue_dim_count: 5,
        }),
        ...Array.from({ length: 10 }, (_, i) =>
          stubScore({
            catalogue_key: `partial|m-${i}|2019`,
            catalogue_fit_score: 91,
            active_catalogue_dim_count: 4,
            release_year: 2019,
          })
        ),
      ];
      const { differentiation_blocked, family_stats } = rankCatalogueHeads(
        scored,
        3,
        overlay
      );
      expect(family_stats.top_tied_family_count).toBe(20);
      expect(family_stats.top_tied_min_active_dims).toBe(4);
      expect(differentiation_blocked).toBe(true);
    });

    it("10. only one or two qualifying families — no padding", () => {
      const scored = nFamilies(2, {
        catalogue_fit_score: 88,
        active_catalogue_dim_count: 4,
      });
      const { recommendations, differentiation_blocked } = rankCatalogueHeads(
        scored,
        3,
        overlay
      );
      expect(differentiation_blocked).toBe(false);
      expect(recommendations).toHaveLength(2);
    });

    it("13. deterministic output across repeated runs", () => {
      const scored = [
        ...nFamilies(3, {
          catalogue_fit_score: 90,
          active_catalogue_dim_count: 4,
        }),
        stubScore({
          catalogue_key: FAMILY.g430Hl,
          catalogue_fit_score: 90,
          active_catalogue_dim_count: 4,
        }),
      ];
      const a = rankCatalogueHeads(scored, 3, overlay);
      const b = rankCatalogueHeads(scored, 3, overlay);
      expect(a.recommendations.map((r) => r.catalogue_key)).toEqual(
        b.recommendations.map((r) => r.catalogue_key)
      );
    });
  });

  it("inventory attach remains exact-key only (no family-sibling attach)", () => {
    const recommendations = [
      stubScore({ catalogue_key: FAMILY.g430Max, catalogue_fit_score: 95 }),
    ];
    const baseFields = {
      merchant_id: "seller-1",
      source_type: "TEEVO_LISTING" as const,
      shaft_key: null,
      condition: "Good",
      price_minor: 25000,
      currency: "GBP" as const,
      availability_status: "AVAILABLE" as const,
      availability_checked_at: "2026-10-19T00:00:00.000Z",
      purchase_route: "TEEVO_CHECKOUT" as const,
      identity: {
        head_resolution: "UNIQUE" as const,
        shaft_resolution: "UNRESOLVED" as const,
        evidence: [],
      },
    };
    const siblingHlListing: MatchInventoryItem = {
      ...baseFields,
      source_listing_id: "listing-hl",
      head_key: FAMILY.g430Hl,
      listed_config: {
        brand: "PING",
        model: "G430 Max HL",
        handedness: "RIGHT",
        stated_loft_deg: null,
        shaft_label: null,
        shaft_flex_raw: null,
      },
    };
    const exactListing: MatchInventoryItem = {
      ...baseFields,
      source_listing_id: "listing-max",
      head_key: FAMILY.g430Max,
      listed_config: {
        brand: "PING",
        model: "G430 Max",
        handedness: "RIGHT",
        stated_loft_deg: null,
        shaft_label: null,
        shaft_flex_raw: null,
      },
    };

    const attachments = attachInventoryToCatalogueRecommendations({
      recommendations,
      inventory: [siblingHlListing, exactListing],
      requirements: sparseReq(),
      intelligence: intel,
      golferConfidence: 0.8,
    });

    expect(attachments).toHaveLength(1);
    expect(attachments[0].catalogue_key).toBe(FAMILY.g430Max);
    expect(attachments[0].items.map((i) => i.item.head_key)).toEqual([
      FAMILY.g430Max,
    ]);
    expect(attachments[0].items[0].item.head_key).not.toBe(FAMILY.g430Hl);
  });

  it("runCatalogueRecommendation stamps overlay version and family audit fields", () => {
    const result = runCatalogueRecommendation({
      skipUkMarketGate: true,
      answers: {
        handedness: "RIGHT",
        handicap: 10,
        club_speed_mph: 95,
        typical_trajectory: "MID",
        typical_start_direction: "RIGHT",
        typical_curvature: "RIGHT",
        miss_severity: "LARGE",
        strike_pattern: "CENTRE",
        strike_consistency: "MEDIUM",
        primary_objective: "DISTANCE",
        current_club_satisfaction: "UNKNOWN",
        budget_max_gbp: 250,
      },
      intelligence: intel,
      headConfigOverlay: overlay,
    });
    expect(result.versions.head_config_overlay).toBe(
      MATCH_HEAD_CONFIG_OVERLAY_VERSION
    );
    expect(result.audit).toHaveProperty("qualifying_heads_before_family_dedupe");
    expect(result.audit).toHaveProperty("family_duplicates_suppressed");
    expect(result.audit).toHaveProperty("recommendations_returned");
  });
});
