import { describe, expect, it } from "vitest";
import path from "path";
import { loadMatchIntelligence, runCatalogueRecommendation } from "@/lib/match";
import {
  CATALOGUE_RECOMMENDATION_KIND,
  type CatalogueHeadScore,
} from "@/lib/match/catalogue-types";
import {
  characteristicEquivalenceKey,
  selectPresentedCatalogueHeads,
} from "@/lib/match/app/present-catalogue-selection";
import { presentHeadCard } from "@/lib/match/app/present-head-card";
import type { DimensionTrace } from "@/lib/match/types";
import type { MatchInventoryItem } from "@/lib/match/inventory/types";
import type { UkHeadRelevanceIndex } from "@/lib/match/uk-head-relevance";

const REFERENCE = path.join(
  process.cwd(),
  "docs/teevo-match/driver-match-v1.1/reference"
);

const SLICE = {
  handedness: "RIGHT",
  handicap: 22,
  club_speed_mph: 85,
  typical_trajectory: "MID",
  typical_start_direction: "LEFT",
  typical_curvature: "RIGHT",
  miss_severity: "LARGE",
  strike_pattern: "CENTRE",
  strike_consistency: "LOW",
  primary_objective: "REDUCE_RIGHT_MISS",
  current_club_satisfaction: "LOW",
};

function dim(score: number, reliability = 1): DimensionTrace {
  return { active: true, nominal_weight: 1, reliability, score };
}

function head(
  patch: Partial<CatalogueHeadScore> & { catalogue_key: string }
): CatalogueHeadScore {
  return {
    kind: CATALOGUE_RECOMMENDATION_KIND,
    brand: "Test",
    model: patch.catalogue_key,
    display_name: patch.catalogue_key,
    release_year: 2020,
    excluded: false,
    catalogue_fit_score: 90,
    catalogue_match_band: "EXCELLENT_MATCH",
    suppressed: false,
    scorable: true,
    dimensions: {
      forgiveness: dim(100),
      stability: dim(100),
      workability: dim(100),
      direction: dim(85),
      head_launch: dim(85),
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
    ...patch,
  };
}

function uk(statuses: Record<string, "UK_ESTABLISHED" | "UK_OBSERVED">): UkHeadRelevanceIndex {
  return {
    version: "MATCH_UK_HEAD_RELEVANCE_V1",
    intelligence_heads_ref: "TEST",
    source_register_ref: "TEST",
    byCatalogueKey: new Map(
      Object.entries(statuses).map(([catalogue_key, uk_market_status]) => [
        catalogue_key,
        {
          catalogue_key,
          market_code: "GB" as const,
          uk_market_status,
          market_review_state: "REVIEWED" as const,
          recommendation_eligible: true,
          hold_reason: null,
          evidence_class: uk_market_status,
        },
      ])
    ),
  };
}

describe("catalogue presentation selection", () => {
  const intel = loadMatchIntelligence(REFERENCE);

  it("keeps Fit order for the Adams profile and labels the equivalent Wilson head as Best Match", () => {
    const result = runCatalogueRecommendation({
      answers: SLICE,
      intelligence: intel,
    });
    expect(result.mode).toBe("NAMED_HEADS");
    const adams = result.recommendations.find((item) => item.catalogue_key === "adams|xtd|2014");
    const wilson = result.recommendations.find(
      (item) => item.catalogue_key === "wilson|dynapwr-titanium|2023"
    );
    const qi35 = result.recommendations.find(
      (item) => item.catalogue_key === "taylormade|qi35-max|2025"
    );
    expect(adams?.catalogue_fit_score).toBeCloseTo(94.05172413793103, 8);
    expect(wilson?.catalogue_fit_score).toBeCloseTo(94.05172413793103, 8);
    expect(adams?.catalogue_fit_score).toBe(wilson?.catalogue_fit_score);
    expect(wilson!.confidence_components.equipment).toBeGreaterThan(
      adams!.confidence_components.equipment
    );
    expect(result.presentation_choices?.map((choice) => choice.label)).toEqual([
      "Best Match",
      "Alternative Match",
      "Newer Option",
    ]);
    expect(result.presentation_choices?.map((choice) => choice.catalogueKey)).toEqual([
      "wilson|dynapwr-titanium|2023",
      "adams|xtd|2014",
      "taylormade|qi35-max|2025",
    ]);
    expect(result.presentation_choices?.[0].substitution?.code).toBe(
      "PRESENTATION_EQUIVALENT_SUBSTITUTION"
    );
    expect(result.presentation_choices?.[0].substitution?.factors).toEqual(["STRONGER_EVIDENCE"]);
    expect(result.presentation_choices?.[0].note).toMatch(/Same assessed suitability/);
    expect(result.presentation_choices?.[0].note).toMatch(/supporting evidence is stronger/);
    expect(result.presentation_choices?.[1].note).toMatch(/Same assessed suitability/);
    expect(result.presentation_choices?.[0].substitution?.equalSuitability).toBe(true);
    expect(qi35?.release_year).toBe(2025);
    expect(JSON.stringify(result.presentation_choices)).not.toMatch(/Best Value/);

    const card = presentHeadCard(
      wilson!,
      result.explanations[0],
      result.normalised_requirements,
      result.recommendations
    );
    expect(card.headline).toMatch(/miss pattern/i);
    expect(card.reason?.text ?? "").not.toMatch(/shape shots/i);
    expect(card.benefits.map((benefit) => benefit.code)).toEqual([
      "DIRECTION",
      "FORGIVENESS",
      "STABILITY",
    ]);
    expect(cardText(card)).not.toContain(String(wilson?.catalogue_fit_score));
  });

  it("retains a niche leader when no presentation brand shares its dimension scores", () => {
    const niche = head({
      catalogue_key: "adams|xtd|2014",
      brand: "Adams",
      model: "XTD",
      catalogue_fit_score: 96,
      dimensions: { direction: dim(100), forgiveness: dim(100) },
    });
    const wilson = head({
      catalogue_key: "wilson|dynapwr-titanium|2023",
      brand: "Wilson",
      model: "DYNAPWR Titanium",
      release_year: 2023,
      catalogue_fit_score: 90,
      dimensions: { direction: dim(80), forgiveness: dim(100) },
    });
    const selected = selectPresentedCatalogueHeads({
      technicalShortlist: [niche, wilson],
      familyWinners: [niche, wilson],
      topTiedFamilyCount: 1,
    });
    expect(selected.choices[0]).toMatchObject({
      catalogueKey: "adams|xtd|2014",
      label: "Best Match",
      substitution: null,
    });
  });

  it("keeps Honma when its evidence is stronger than an equivalent familiar head", () => {
    const honma = head({
      catalogue_key: "honma|tw747-455|2018",
      brand: "Honma",
      model: "TW747 455",
      release_year: 2018,
      catalogue_fit_score: 98.89,
      dimensions: { forgiveness: dim(100, 1), head_launch: dim(100, 1) },
    });
    const callaway = head({
      catalogue_key: "callaway|epic-max-ls|2021",
      brand: "Callaway",
      model: "Epic Max LS",
      release_year: 2021,
      catalogue_fit_score: 98.85,
      dimensions: { forgiveness: dim(100, 1), head_launch: dim(100, 0.85) },
    });
    expect(characteristicEquivalenceKey(honma)).toBe(characteristicEquivalenceKey(callaway));
    const selected = selectPresentedCatalogueHeads({
      technicalShortlist: [honma, callaway],
      familyWinners: [honma, callaway],
      topTiedFamilyCount: 1,
      uk: uk({
        "honma|tw747-455|2018": "UK_OBSERVED",
        "callaway|epic-max-ls|2021": "UK_OBSERVED",
      }),
    });
    expect(selected.choices[0].catalogueKey).toBe("honma|tw747-455|2018");
    expect(selected.choices[0].substitution).toBeNull();
  });

  it("does not treat low-reliability evidence as equivalent", () => {
    const leader = head({
      catalogue_key: "niche|one|2014",
      brand: "Adams",
      model: "One",
      dimensions: { forgiveness: dim(100, 0.5) },
    });
    const familiar = head({
      catalogue_key: "ping|g430-max|2023",
      brand: "PING",
      model: "G430 Max",
      release_year: 2023,
      catalogue_fit_score: 89,
      dimensions: { forgiveness: dim(100, 0.5) },
    });
    const selected = selectPresentedCatalogueHeads({
      technicalShortlist: [leader, familiar],
      familyWinners: [leader, familiar],
      topTiedFamilyCount: 1,
    });
    expect(selected.choices[0].catalogueKey).toBe("niche|one|2014");
  });

  it("leaves a large exact-Fit tie in engine order", () => {
    const newerFamiliar = head({
      catalogue_key: "ping|g430-max|2024",
      brand: "PING",
      model: "G430 Max",
      release_year: 2024,
      catalogue_fit_score: 100,
    });
    const olderNiche = head({
      catalogue_key: "honma|tw747|2018",
      brand: "Honma",
      model: "TW747",
      release_year: 2018,
      catalogue_fit_score: 100,
    });
    const selected = selectPresentedCatalogueHeads({
      technicalShortlist: [olderNiche, newerFamiliar],
      familyWinners: [olderNiche, newerFamiliar],
      topTiedFamilyCount: 34,
    });
    expect(selected.heads.map((item) => item.catalogue_key)).toEqual([
      "honma|tw747|2018",
      "ping|g430-max|2024",
    ]);
    expect(selected.choices[0].substitution).toBeNull();
  });

  it("omits Newer Option when nothing in the window is a later year in the same band", () => {
    const leader = head({
      catalogue_key: "adams|old|2026",
      brand: "Adams",
      model: "Old",
      release_year: 2026,
      catalogue_fit_score: 96,
      dimensions: { forgiveness: dim(40, 1) },
    });
    const earlier = head({
      catalogue_key: "ping|latest|2020",
      brand: "PING",
      model: "Latest",
      release_year: 2020,
      catalogue_fit_score: 90,
    });
    const selected = selectPresentedCatalogueHeads({
      technicalShortlist: [leader, earlier],
      familyWinners: [leader, earlier],
      topTiedFamilyCount: 1,
    });
    expect(selected.choices.map((choice) => choice.label)).toEqual([
      "Best Match",
      "Alternative Match",
    ]);
    expect(selected.choices[0].catalogueKey).toBe("adams|old|2026");
  });

  it("withholds names on a guidance profile", () => {
    const result = runCatalogueRecommendation({
      answers: {
        handedness: "RIGHT",
        handicap: 14,
        club_speed_mph: 95,
        typical_trajectory: "MID",
        typical_start_direction: "CENTRE",
        typical_curvature: "STRAIGHT",
        miss_severity: "MODERATE",
        strike_pattern: "CENTRE",
        strike_consistency: "MEDIUM",
        primary_objective: "DISTANCE",
        current_club_satisfaction: "MEDIUM",
      },
      intelligence: intel,
    });
    expect(result.mode).toBe("CHARACTERISTIC_GUIDANCE");
    expect(result.recommendations).toEqual([]);
    expect(result.presentation_choices).toBeUndefined();
  });

  it("attaches inventory only to the presented head that is actually in stock", () => {
    const listing: MatchInventoryItem = {
      merchant_id: "seller-1",
      source_type: "TEEVO_LISTING",
      source_listing_id: "L-wilson",
      head_key: "wilson|dynapwr-titanium|2023",
      shaft_key: null,
      listed_config: {
        brand: "Wilson",
        model: "DYNAPWR Titanium",
        handedness: "RIGHT",
        stated_loft_deg: 10.5,
        shaft_label: null,
        shaft_flex_raw: null,
      },
      condition: "Good",
      price_minor: 18000,
      currency: "GBP",
      availability_status: "AVAILABLE",
      availability_checked_at: "2026-10-18T00:00:00.000Z",
      purchase_route: "TEEVO_CHECKOUT",
      identity: {
        head_resolution: "UNIQUE",
        shaft_resolution: "UNRESOLVED",
        evidence: ["brand:Wilson"],
      },
    };
    const stocked = runCatalogueRecommendation({
      answers: SLICE,
      intelligence: intel,
      inventory: [listing],
    });
    const wilsonAttachment = stocked.inventory_attachments.find(
      (attachment) => attachment.catalogue_key === "wilson|dynapwr-titanium|2023"
    );
    const adamsAttachment = stocked.inventory_attachments.find(
      (attachment) => attachment.catalogue_key === "adams|xtd|2014"
    );
    expect(wilsonAttachment?.items.length).toBe(1);
    expect(adamsAttachment?.items.length).toBe(0);
    expect(stocked.recommendations.map((item) => item.catalogue_fit_score)).toEqual(
      runCatalogueRecommendation({ answers: SLICE, intelligence: intel }).recommendations.map(
        (item) => item.catalogue_fit_score
      )
    );

    const empty = runCatalogueRecommendation({
      answers: SLICE,
      intelligence: intel,
      inventory: [],
    });
    expect(empty.inventory_attachments.every((attachment) => attachment.items.length === 0)).toBe(
      true
    );
  });
});

function cardText(card: { reason: { text: string } | null; headline: string | null }): string {
  return `${card.headline ?? ""} ${card.reason?.text ?? ""}`;
}
