import { describe, expect, it } from "vitest";
import {
  CATALOGUE_RECOMMENDATION_KIND,
  type CatalogueHeadScore,
} from "@/lib/match/catalogue-types";
import { presentHeadChoices } from "@/lib/match/app/present-head-choices";

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

describe("head choice presentation", () => {
  it("labels the reported three-head example without a Best Value claim", () => {
    const heads = [
      head({
        catalogue_key: "taylormade|sim-max|2020",
        brand: "TaylorMade",
        model: "SIM Max",
        release_year: 2020,
        catalogue_fit_score: 100,
      }),
      head({
        catalogue_key: "tour-edge|exotics-max|2026",
        brand: "Tour Edge",
        model: "Exotics Max",
        release_year: 2026,
        catalogue_fit_score: 100,
      }),
      head({
        catalogue_key: "ping|g430-max|2023",
        brand: "PING",
        model: "G430 Max",
        release_year: 2023,
        catalogue_fit_score: 98.65470852017937,
      }),
    ];
    const choices = presentHeadChoices(heads);
    expect(choices.map((choice) => choice.catalogueKey)).toEqual(
      heads.map((item) => item.catalogue_key)
    );
    expect(choices.map((choice) => choice.label)).toEqual([
      "Best Match",
      "Newer Option",
      "Alternative Match",
    ]);
    expect(choices[0].tiedForTopSuitability).toBe(true);
    expect(choices[0].note).toMatch(/same result/);
    expect(choices[1].tiedForTopSuitability).toBe(true);
    expect(choices[1].note).toMatch(/same assessed suitability/);
    expect(choices[1].note).toMatch(/not a better fit/);
    expect(choices[2].note).toBeNull();
    expect(JSON.stringify(choices)).not.toMatch(/Best Value|£/);
    expect(heads.map((item) => item.catalogue_fit_score)).toEqual([
      100, 100, 98.65470852017937,
    ]);
  });

  it("uses Best Match alone for one recommendation", () => {
    const choices = presentHeadChoices([
      head({ catalogue_key: "only", model: "Only", release_year: 2024 }),
    ]);
    expect(choices).toEqual([
      {
        catalogueKey: "only",
        category: "BEST_MATCH",
        label: "Best Match",
        tiedForTopSuitability: false,
        note: null,
        substitution: null,
      },
    ]);
  });

  it("uses Alternative Match when the second head is not newer", () => {
    const choices = presentHeadChoices([
      head({ catalogue_key: "a", model: "Alpha", release_year: 2024, catalogue_fit_score: 92 }),
      head({ catalogue_key: "b", model: "Beta", release_year: 2019, catalogue_fit_score: 80 }),
    ]);
    expect(choices.map((choice) => choice.category)).toEqual([
      "BEST_MATCH",
      "ALTERNATIVE_MATCH",
    ]);
    expect(choices[0].tiedForTopSuitability).toBe(false);
  });

  it("keeps a three-way tie to one Best Match and one Newer Option", () => {
    const choices = presentHeadChoices([
      head({ catalogue_key: "a", model: "Alpha", release_year: 2021, catalogue_fit_score: 88 }),
      head({ catalogue_key: "b", model: "Beta", release_year: 2024, catalogue_fit_score: 88 }),
      head({ catalogue_key: "c", model: "Gamma", release_year: 2022, catalogue_fit_score: 88 }),
    ]);
    expect(choices.map((choice) => choice.category)).toEqual([
      "BEST_MATCH",
      "NEWER_OPTION",
      "ALTERNATIVE_MATCH",
    ]);
    expect(choices.every((choice) => choice.tiedForTopSuitability)).toBe(true);
    expect(new Set(choices.map((choice) => choice.catalogueKey)).size).toBe(3);
  });

  it("omits Newer Option when no other head is later", () => {
    const choices = presentHeadChoices([
      head({ catalogue_key: "new", model: "Newest", release_year: 2026, catalogue_fit_score: 95 }),
      head({ catalogue_key: "old", model: "Older", release_year: 2018, catalogue_fit_score: 90 }),
    ]);
    expect(choices.map((choice) => choice.category)).toEqual([
      "BEST_MATCH",
      "ALTERNATIVE_MATCH",
    ]);
  });

  it("omits Newer Option when the Best Match is already the newest tied head", () => {
    const choices = presentHeadChoices([
      head({ catalogue_key: "new", model: "Newest", release_year: 2026, catalogue_fit_score: 90 }),
      head({ catalogue_key: "old", model: "Older", release_year: 2020, catalogue_fit_score: 90 }),
    ]);
    expect(choices.map((choice) => choice.category)).toEqual([
      "BEST_MATCH",
      "ALTERNATIVE_MATCH",
    ]);
    expect(choices[0].tiedForTopSuitability).toBe(true);
  });

  it("omits Newer Option when release years are missing", () => {
    const choices = presentHeadChoices([
      head({ catalogue_key: "a", model: "Alpha", release_year: null }),
      head({ catalogue_key: "b", model: "Beta", release_year: 2025 }),
    ]);
    expect(choices.map((choice) => choice.category)).toEqual([
      "BEST_MATCH",
      "ALTERNATIVE_MATCH",
    ]);
    const noYears = presentHeadChoices([
      head({ catalogue_key: "a", model: "Alpha", release_year: 2020 }),
      head({ catalogue_key: "b", model: "Beta", release_year: null, catalogue_fit_score: 70 }),
    ]);
    expect(noYears.map((choice) => choice.category)).toEqual([
      "BEST_MATCH",
      "ALTERNATIVE_MATCH",
    ]);
  });

  it("returns no categories for guidance with no named heads", () => {
    expect(presentHeadChoices([])).toEqual([]);
  });

  it("does not give a repeated head a second category", () => {
    const choices = presentHeadChoices([
      head({ catalogue_key: "same", model: "Alpha", release_year: 2020 }),
      head({ catalogue_key: "same", model: "Alpha", release_year: 2026 }),
      head({ catalogue_key: "other", model: "Beta", release_year: 2024, catalogue_fit_score: 80 }),
    ]);
    expect(choices.map((choice) => choice.category)).toEqual([
      "BEST_MATCH",
      null,
      "NEWER_OPTION",
    ]);
    expect(choices.filter((choice) => choice.catalogueKey === "same").map((choice) => choice.label)).toEqual([
      "Best Match",
      null,
    ]);
  });

  it("does not treat a later year of the same model as a Newer Option", () => {
    const choices = presentHeadChoices([
      head({ catalogue_key: "sim-2020", model: "SIM Max", release_year: 2020 }),
      head({ catalogue_key: "sim-2024", model: "SIM Max", release_year: 2024, catalogue_fit_score: 80 }),
    ]);
    expect(choices.map((choice) => choice.category)).toEqual([
      "BEST_MATCH",
      "ALTERNATIVE_MATCH",
    ]);
  });

  it("keeps the engine order when a lower head is newer", () => {
    const heads = [
      head({ catalogue_key: "best", model: "Best", release_year: 2019, catalogue_fit_score: 96 }),
      head({ catalogue_key: "mid", model: "Mid", release_year: 2021, catalogue_fit_score: 90 }),
      head({ catalogue_key: "new", model: "New", release_year: 2026, catalogue_fit_score: 84 }),
    ];
    const choices = presentHeadChoices(heads);
    expect(choices.map((choice) => choice.catalogueKey)).toEqual(["best", "mid", "new"]);
    expect(choices.map((choice) => choice.category)).toEqual([
      "BEST_MATCH",
      "ALTERNATIVE_MATCH",
      "NEWER_OPTION",
    ]);
    expect(choices[2].tiedForTopSuitability).toBe(false);
    expect(choices[2].note).toMatch(/not a better fit/);
    expect(choices[2].note).not.toMatch(/same assessed suitability/);
  });

  it("keeps Newer Option in the same band when the Fit score differs", () => {
    const choices = presentHeadChoices([
      head({
        catalogue_key: "best",
        model: "Best",
        release_year: 2019,
        catalogue_fit_score: 96,
        catalogue_match_band: "EXCELLENT_MATCH",
      }),
      head({
        catalogue_key: "new",
        model: "New",
        release_year: 2026,
        catalogue_fit_score: 90,
        catalogue_match_band: "EXCELLENT_MATCH",
      }),
    ]);
    expect(choices.map((choice) => choice.category)).toEqual(["BEST_MATCH", "NEWER_OPTION"]);
    expect(choices[1].tiedForTopSuitability).toBe(false);
    expect(choices[1].note).toMatch(/not a better fit/);
    expect(choices[1].note).not.toMatch(/same assessed suitability/);
  });

  it("omits Newer Option when the later head is in a lower suitability band", () => {
    const choices = presentHeadChoices([
      head({
        catalogue_key: "best",
        model: "Best",
        release_year: 2020,
        catalogue_fit_score: 96,
        catalogue_match_band: "EXCELLENT_MATCH",
      }),
      head({
        catalogue_key: "lower",
        model: "Lower",
        release_year: 2026,
        catalogue_fit_score: 80,
        catalogue_match_band: "VERY_GOOD_MATCH",
      }),
      head({
        catalogue_key: "same-band",
        model: "Same Band",
        release_year: 2022,
        catalogue_fit_score: 88,
        catalogue_match_band: "EXCELLENT_MATCH",
      }),
    ]);
    expect(choices.map((choice) => choice.category)).toEqual([
      "BEST_MATCH",
      "ALTERNATIVE_MATCH",
      "NEWER_OPTION",
    ]);
    expect(choices[2].note).not.toMatch(/same assessed suitability/);

    const onlyLower = presentHeadChoices([
      head({
        catalogue_key: "best",
        model: "Best",
        release_year: 2020,
        catalogue_fit_score: 96,
        catalogue_match_band: "EXCELLENT_MATCH",
      }),
      head({
        catalogue_key: "lower",
        model: "Lower",
        release_year: 2026,
        catalogue_fit_score: 80,
        catalogue_match_band: "VERY_GOOD_MATCH",
      }),
    ]);
    expect(onlyLower.map((choice) => choice.category)).toEqual([
      "BEST_MATCH",
      "ALTERNATIVE_MATCH",
    ]);
  });
});
