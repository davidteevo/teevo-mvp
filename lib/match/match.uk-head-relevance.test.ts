import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import path from "path";
import {
  deriveUkRecommendationEligibility,
  loadMatchIntelligence,
  loadUkHeadRelevanceOverlay,
  rankCatalogueHeads,
  UK_MARKET_CODE_GB,
} from "@/lib/match";
import type { CatalogueHeadScore } from "@/lib/match/catalogue-types";
import type { UkHeadRelevanceIndex } from "@/lib/match/uk-head-relevance";

const REFERENCE = path.join(
  process.cwd(),
  "docs/teevo-match/driver-match-v1.1/reference"
);

function stubScore(
  patch: Partial<CatalogueHeadScore> & { catalogue_key: string }
): CatalogueHeadScore {
  return {
    kind: "CATALOGUE_HEAD_SUITABILITY",
    catalogue_key: patch.catalogue_key,
    brand: "Brand",
    model: patch.catalogue_key,
    display_name: patch.catalogue_key,
    release_year: patch.release_year ?? 2024,
    excluded: false,
    catalogue_fit_score: patch.catalogue_fit_score ?? 90,
    catalogue_match_band: patch.catalogue_match_band ?? "EXCELLENT_MATCH",
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
    active_catalogue_dim_count: patch.active_catalogue_dim_count ?? 5,
    head_recommendation_confidence_score: 0.8,
    head_recommendation_confidence: "HIGH",
    confidence_components: { golfer: 0.8, equipment: 0.8, listing: null },
    considerations: [],
    scope_disclaimer: "MODEL_LEVEL_SUITABILITY_ONLY",
  };
}

function miniUkOverlay(
  members: Array<{
    catalogue_key: string;
    uk_market_status:
      | "UK_ESTABLISHED"
      | "UK_OBSERVED"
      | "UK_UNVERIFIED"
      | "REGION_RESTRICTED";
    market_review_state: "REVIEWED" | "NEEDS_REVIEW" | "NOT_REVIEWED";
  }>
): UkHeadRelevanceIndex {
  const byCatalogueKey = new Map();
  for (const m of members) {
    const d = deriveUkRecommendationEligibility(
      m.uk_market_status,
      m.market_review_state
    );
    byCatalogueKey.set(m.catalogue_key, {
      catalogue_key: m.catalogue_key,
      market_code: UK_MARKET_CODE_GB,
      uk_market_status: m.uk_market_status,
      market_review_state: m.market_review_state,
      recommendation_eligible: d.recommendation_eligible,
      hold_reason: d.hold_reason,
      evidence_class: d.evidence_class,
    });
  }
  return {
    version: "MATCH_UK_HEAD_RELEVANCE_V1",
    intelligence_heads_ref: "DRIVER_V1_2026-10-16",
    source_register_ref: "TEST",
    byCatalogueKey,
  };
}

describe("UK head relevance policy", () => {
  it("derives eligibility from status × review state", () => {
    expect(
      deriveUkRecommendationEligibility("UK_ESTABLISHED", "REVIEWED")
        .recommendation_eligible
    ).toBe(true);
    expect(
      deriveUkRecommendationEligibility("UK_OBSERVED", "REVIEWED")
        .recommendation_eligible
    ).toBe(true);
    expect(
      deriveUkRecommendationEligibility("UK_ESTABLISHED", "NEEDS_REVIEW")
        .recommendation_eligible
    ).toBe(false);
    expect(
      deriveUkRecommendationEligibility("UK_UNVERIFIED", "REVIEWED")
        .recommendation_eligible
    ).toBe(false);
    expect(
      deriveUkRecommendationEligibility("REGION_RESTRICTED", "REVIEWED")
        .recommendation_eligible
    ).toBe(false);
  });

  it("filters UK-held heads before family shortlist / B2.1", () => {
    const uk = miniUkOverlay([
      {
        catalogue_key: "a|one|2020",
        uk_market_status: "UK_ESTABLISHED",
        market_review_state: "REVIEWED",
      },
      {
        catalogue_key: "b|two|2020",
        uk_market_status: "UK_UNVERIFIED",
        market_review_state: "REVIEWED",
      },
      {
        catalogue_key: "c|three|2020",
        uk_market_status: "UK_OBSERVED",
        market_review_state: "REVIEWED",
      },
    ]);
    const scored = [
      stubScore({ catalogue_key: "b|two|2020", catalogue_fit_score: 99 }),
      stubScore({ catalogue_key: "a|one|2020", catalogue_fit_score: 90 }),
      stubScore({ catalogue_key: "c|three|2020", catalogue_fit_score: 89 }),
    ];
    const { recommendations, family_stats, differentiation_blocked } =
      rankCatalogueHeads(scored, 3, null, uk);
    expect(differentiation_blocked).toBe(false);
    expect(recommendations.map((r) => r.catalogue_key)).toEqual([
      "a|one|2020",
      "c|three|2020",
    ]);
    expect(family_stats.heads_held_uk_market).toBe(1);
    expect(family_stats.heads_uk_market_eligible).toBe(2);
  });

  it("does not rank ESTABLISHED above OBSERVED by market class alone", () => {
    const uk = miniUkOverlay([
      {
        catalogue_key: "obs|x|2020",
        uk_market_status: "UK_OBSERVED",
        market_review_state: "REVIEWED",
      },
      {
        catalogue_key: "est|x|2020",
        uk_market_status: "UK_ESTABLISHED",
        market_review_state: "REVIEWED",
      },
    ]);
    const scored = [
      stubScore({ catalogue_key: "obs|x|2020", catalogue_fit_score: 95 }),
      stubScore({ catalogue_key: "est|x|2020", catalogue_fit_score: 90 }),
    ];
    const { recommendations } = rankCatalogueHeads(scored, 3, null, uk);
    expect(recommendations.map((r) => r.catalogue_key)).toEqual([
      "obs|x|2020",
      "est|x|2020",
    ]);
  });

  it("fails closed when overlay market_code is not GB", () => {
    const intel = loadMatchIntelligence(REFERENCE);
    const dir = mkdtempSync(join(tmpdir(), "teevo-uk-"));
    const anyKey = Object.keys(intel.headsByKey)[0];
    writeFileSync(
      join(dir, "uk-head-relevance.v1.json"),
      JSON.stringify({
        overlay_version: "MATCH_UK_HEAD_RELEVANCE_V1",
        intelligence_heads_ref: "DRIVER_V1_2026-10-16",
        source_register_ref: "TEST",
        members: [
          {
            catalogue_key: anyKey,
            market_code: "UK",
            uk_market_status: "UK_ESTABLISHED",
            market_review_state: "REVIEWED",
            recommendation_eligible: true,
            hold_reason: null,
            evidence_class: "UK_ESTABLISHED",
          },
        ],
      })
    );
    expect(() => loadUkHeadRelevanceOverlay(dir, intel)).toThrow(/malformed|GB/);
  });
});
