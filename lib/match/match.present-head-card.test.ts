import { describe, expect, it } from "vitest";
import { CATALOGUE_RECOMMENDATION_KIND, type CatalogueHeadExplanation, type CatalogueHeadScore } from "@/lib/match/catalogue-types";
import { explainCatalogueHead, CATALOGUE_HEAD_REASON } from "@/lib/match/app/explain";
import {
  EQUAL_HEAD_SCORE_MESSAGE,
  HEAD_SUITABILITY_BAND_LABEL,
  namedHeadsScoredEqually,
  presentHeadCard,
  presentNamedHeadCards,
  type PresentedHeadCard,
} from "@/lib/match/app/present-head-card";
import type { Band, DimensionTrace, NormalisedRequirements } from "@/lib/match/types";

function dim(active: boolean, score: number | null = active ? 100 : null): DimensionTrace {
  return { active, nominal_weight: 1, reliability: active ? 1 : 0, score };
}

function score(patch: Partial<CatalogueHeadScore> & { catalogue_key: string }): CatalogueHeadScore {
  return {
    kind: CATALOGUE_RECOMMENDATION_KIND,
    brand: "Ping",
    model: "G430",
    display_name: "Ping G430 Max",
    release_year: 2023,
    excluded: false,
    catalogue_fit_score: 91.25,
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

function requirements(patch: Partial<NormalisedRequirements> = {}): NormalisedRequirements {
  return {
    handedness: "RIGHT",
    recommendation_intent: "UNANCHORED",
    head_launch_target: "UNRESOLVED",
    head_launch_target_numeric: null,
    head_spin_target: "UNRESOLVED",
    forgiveness_requirement: null,
    stability_requirement: null,
    directional_target_numeric: null,
    directional_requirement: "UNRESOLVED",
    workability_preference: null,
    driver_subtype_allowed: "STANDARD",
    preferred_loft_min_deg: null,
    preferred_loft_max_deg: null,
    shaft_weight_min_g: null,
    shaft_weight_max_g: null,
    shaft_flex_min_value: null,
    shaft_flex_max_value: null,
    shaft_launch_target: "UNRESOLVED",
    shaft_launch_target_numeric: null,
    shaft_spin_target: "UNRESOLVED",
    shaft_torque_target_deg: null,
    conflict_flags: [],
    requirement_confidence: {} as NormalisedRequirements["requirement_confidence"],
    ...patch,
  };
}

function explanation(
  catalogueKey: string,
  patch: Partial<CatalogueHeadExplanation> = {}
): CatalogueHeadExplanation {
  return {
    catalogue_key: catalogueKey,
    suitability_summary: `${catalogueKey} summary from the engine.`,
    reasons: [],
    trade_offs: ["Catalogue Fit does not score loft or shaft. Preferred loft and shaft profile are guidance only."],
    uncertainty: [],
    ...patch,
  };
}

function cardText(card: PresentedHeadCard): string {
  return JSON.stringify(card);
}

describe("B2a head card presentation", () => {
  it("maps every returned band and does not invent a label", () => {
    const bands: Band[] = [
      "EXCELLENT_MATCH",
      "VERY_GOOD_MATCH",
      "GOOD_MATCH",
      "DO_NOT_ACTIVELY_RECOMMEND",
    ];
    expect(HEAD_SUITABILITY_BAND_LABEL.EXCELLENT_MATCH).toBe("Strong head fit");
    expect(HEAD_SUITABILITY_BAND_LABEL.VERY_GOOD_MATCH).toBe("Very good head fit");
    expect(HEAD_SUITABILITY_BAND_LABEL.GOOD_MATCH).toBe("Good head fit");
    expect(HEAD_SUITABILITY_BAND_LABEL.DO_NOT_ACTIVELY_RECOMMEND).toBe(
      "Not actively recommended"
    );
    for (const band of bands) {
      const card = presentHeadCard(
        score({ catalogue_key: band, catalogue_match_band: band }),
        explanation(band),
        requirements()
      );
      expect(card.bandLabel).toBe(HEAD_SUITABILITY_BAND_LABEL[band]);
    }
    const unlabeled = presentHeadCard(
      score({ catalogue_key: "none", catalogue_match_band: null }),
      explanation("none"),
      requirements()
    );
    expect(unlabeled.bandLabel).toBeNull();
  });

  it("uses the engine display name, and keeps one, two, and three heads in engine order", () => {
    const heads = [
      score({
        catalogue_key: "a",
        brand: "Cleveland",
        model: "Launcher XL Lite",
        display_name: "Cleveland Launcher XL Lite Draw Driver",
      }),
      score({
        catalogue_key: "b",
        brand: "Callaway",
        model: "Paradym",
        display_name: null,
      }),
      score({
        catalogue_key: "c",
        brand: "TaylorMade",
        model: "Qi10",
        display_name: "TaylorMade Qi10",
      }),
    ];
    const presented = presentNamedHeadCards(
      heads,
      heads.map((head) => explanation(head.catalogue_key)),
      requirements()
    );
    expect(presented.map((card) => card.catalogueKey)).toEqual(["a", "b", "c"]);
    expect(presented.map((card) => card.title)).toEqual([
      "Cleveland Launcher XL Lite Draw Driver",
      "Callaway Paradym",
      "TaylorMade Qi10",
    ]);
    expect(presentNamedHeadCards(heads.slice(0, 1), [explanation("a")], requirements())).toHaveLength(1);
    expect(presentNamedHeadCards(heads.slice(0, 2), [explanation("a"), explanation("b")], requirements())).toHaveLength(2);
  });

  it("translates each recognised engine reason and does not promise a ball flight", () => {
    const cases = [
      ["FORGIVENESS", "Forgiveness looks consistent with what you told us."],
      ["STABILITY", "Stability looks consistent with what you told us."],
      ["WORKABILITY", "The amount of shot shaping looks consistent with what you prefer."],
      [
        "DIRECTION",
        "This head's usual shot shape looks consistent with the start and curve you described. That does not guarantee your ball flight.",
      ],
      [
        "LAUNCH",
        "This head's usual launch looks consistent with the flight you described. The loft you play still matters.",
      ],
    ] as const;
    for (const [code, plain] of cases) {
      const head = score({
        catalogue_key: code,
        dimensions: {
          forgiveness: dim(code === "FORGIVENESS"),
          stability: dim(code === "STABILITY"),
          workability: dim(code === "WORKABILITY", 100),
          direction: dim(code === "DIRECTION"),
          head_launch: dim(code === "LAUNCH"),
        },
      });
      const card = presentHeadCard(
        head,
        explanation(code, { reasons: [CATALOGUE_HEAD_REASON[code]] }),
        requirements()
      );
      expect(card.reason).toEqual({ source: "recognised", code, text: plain });
      expect(card.reason?.text).not.toMatch(/will |correct a miss|clubface/i);
    }
  });

  it("falls back to the suitability summary when the reason text is not a known template", () => {
    const head = score({
      catalogue_key: "future",
      dimensions: { forgiveness: dim(true) },
    });
    const card = presentHeadCard(
      head,
      explanation("future", {
        reasons: ["A future engine sentence that is not a current template."],
        suitability_summary: "Future head summary from the engine.",
      }),
      requirements()
    );
    expect(card.reason).toEqual({
      source: "summary",
      code: null,
      text: "Future head summary from the engine.",
    });
    expect(cardText(card)).not.toContain("Forgiveness looks consistent");
  });

  it("does not borrow a reason or summary from a different head", () => {
    const card = presentHeadCard(
      score({ catalogue_key: "shown" }),
      explanation("other", {
        reasons: [CATALOGUE_HEAD_REASON.FORGIVENESS],
        suitability_summary: "Other head summary.",
      }),
      requirements()
    );
    expect(card.reason).toBeNull();
    expect(cardText(card)).not.toContain("Other head summary");
    expect(cardText(card)).not.toContain("Forgiveness looks consistent");
  });

  it("shows one stated-objective caveat and keeps the other limitations in the details", () => {
    const head = score({
      catalogue_key: "gap",
      active_catalogue_dim_count: 3,
      head_recommendation_confidence: "MEDIUM",
      considerations: ["SPEED_CARRY_CONFLICT"],
      dimensions: {
        forgiveness: dim(false),
        workability: dim(true, 70),
        direction: dim(false),
        head_launch: dim(false),
      },
    });
    const req = requirements({
      forgiveness_requirement: 4,
      directional_target_numeric: 1,
      head_launch_target: "MID",
      head_launch_target_numeric: 0,
    });
    const engine = explainCatalogueHead(head, req);
    const card = presentHeadCard(head, engine, req);
    expect(card.caveat?.kind).toBe("FORGIVENESS_EVIDENCE");
    expect(card.details.otherCaveats).toEqual([
      "We could not fully check the shot shape you described for this head.",
      "We could not fully check the launch you described for this head.",
      "Shot shaping looks like a compromise for this head.",
      "Your swing speed and carry distance do not agree, so this suggestion is less certain.",
      "We could only check some of the usual head traits, so treat this as a guide.",
      "This suggestion is less certain from the answers so far.",
    ]);
    expect(card.details.uncertainty.some((line) => line.includes("Only 3 of 5"))).toBe(true);
    expect(card.details.coverageLabel).toBe("Checked 3 of 5 head traits.");
    expect(card.details.tradeOffs.length).toBeGreaterThan(0);
    expect(cardText(card)).not.toContain("91.25");
  });

  it("uses the workability compromise only below the engine threshold", () => {
    const below = presentHeadCard(
      score({
        catalogue_key: "low-work",
        dimensions: { workability: dim(true, 84) },
      }),
      explanation("low-work", { reasons: [CATALOGUE_HEAD_REASON.STABILITY] }),
      requirements()
    );
    expect(below.caveat?.kind).toBe("WORKABILITY_COMPROMISE");

    const atThreshold = presentHeadCard(
      score({
        catalogue_key: "ok-work",
        dimensions: { workability: dim(true, 85) },
      }),
      explanation("ok-work", { reasons: [CATALOGUE_HEAD_REASON.WORKABILITY] }),
      requirements()
    );
    expect(atThreshold.caveat).toBeNull();
    expect(atThreshold.reason?.code).toBe("WORKABILITY");
  });

  it("does not invent a missing-evidence caveat the engine does not record", () => {
    const card = presentHeadCard(
      score({
        catalogue_key: "stable",
        dimensions: { stability: dim(false), forgiveness: dim(true) },
      }),
      explanation("stable", { reasons: [CATALOGUE_HEAD_REASON.FORGIVENESS] }),
      requirements({ stability_requirement: 4, forgiveness_requirement: null })
    );
    expect(card.caveat).toBeNull();
    expect(card.reason?.code).toBe("FORGIVENESS");
  });

  it("keeps an unknown conflict generic", () => {
    const card = presentHeadCard(
      score({
        catalogue_key: "conflict",
        considerations: ["FUTURE_INPUT_CONFLICT"],
      }),
      explanation("conflict"),
      requirements()
    );
    expect(card.caveat).toEqual({
      kind: "INPUT_CONFLICT",
      text: "Some of your answers conflict, so this suggestion is less certain.",
    });
    expect(cardText(card)).not.toContain("FUTURE_INPUT_CONFLICT");
  });

  it("states equal scores only for the existing same-band exact-score condition", () => {
    const equal = [
      score({ catalogue_key: "a", catalogue_match_band: "GOOD_MATCH", catalogue_fit_score: 70 }),
      score({ catalogue_key: "b", catalogue_match_band: "GOOD_MATCH", catalogue_fit_score: 70 }),
    ];
    const different = [
      score({ catalogue_key: "a", catalogue_match_band: "GOOD_MATCH", catalogue_fit_score: 70 }),
      score({ catalogue_key: "b", catalogue_match_band: "GOOD_MATCH", catalogue_fit_score: 71 }),
    ];
    const differentBand = [
      score({ catalogue_key: "a", catalogue_match_band: "GOOD_MATCH", catalogue_fit_score: 70 }),
      score({ catalogue_key: "b", catalogue_match_band: "VERY_GOOD_MATCH", catalogue_fit_score: 70 }),
    ];
    expect(namedHeadsScoredEqually(equal)).toBe(true);
    expect(namedHeadsScoredEqually(different)).toBe(false);
    expect(namedHeadsScoredEqually(differentBand)).toBe(false);
    expect(namedHeadsScoredEqually(equal.slice(0, 1))).toBe(false);
    expect(EQUAL_HEAD_SCORE_MESSAGE).toBe(
      "These driver heads scored equally on the characteristics we assessed."
    );
  });

  it("puts release year in the details and leaves the fit number off the card", () => {
    const card = presentHeadCard(
      score({ catalogue_key: "year", catalogue_fit_score: 73.21, release_year: 2019 }),
      explanation("year", { reasons: [CATALOGUE_HEAD_REASON.STABILITY] }),
      requirements()
    );
    expect(card.details.releaseYearLabel).toBe("Released in 2019.");
    expect(card.title).not.toContain("2019");
    expect(cardText(card)).not.toContain("73.21");
  });

  it("names a distinct leader and states only a real dimension gap", () => {
    const leader = score({
      catalogue_key: "leader",
      display_name: "Leader Driver",
      catalogue_fit_score: 92,
      catalogue_match_band: "EXCELLENT_MATCH",
      dimensions: {
        forgiveness: dim(true, 96),
        stability: dim(true, 80),
      },
    });
    const other = score({
      catalogue_key: "other",
      display_name: "Other Driver",
      catalogue_fit_score: 80,
      catalogue_match_band: "VERY_GOOD_MATCH",
      dimensions: {
        forgiveness: dim(true, 70),
        stability: dim(true, 90),
      },
    });
    const peers = [leader, other];
    const req = requirements({ forgiveness_requirement: 4 });
    const leadCard = presentHeadCard(leader, explanation("leader", { reasons: [CATALOGUE_HEAD_REASON.FORGIVENESS] }), req, peers);
    const otherCard = presentHeadCard(other, explanation("other", { reasons: [CATALOGUE_HEAD_REASON.FORGIVENESS] }), req, peers);
    expect(leadCard.role).toBe("BEST_SUPPORTED");
    expect(leadCard.roleLabel).toBe("Top Head Match");
    expect(otherCard.role).toBe("ALTERNATIVE");
    expect(otherCard.roleLabel).toBe("Alternative Head Match");
    expect(leadCard.headline).toBe("A strong option if forgiveness is your priority.");
    expect(leadCard.reason?.text).toBe(
      "Your answers suggest forgiveness matters for your game. This head's assessed forgiveness is stronger than the other recommended heads, so it is worth considering if that is the trait you want."
    );
    expect(otherCard.headline).toBe("An alternative with a different balance.");
    expect(otherCard.reason?.text).toBe(
      "Your answers suggest forgiveness matters for your game. This head's assessed forgiveness is lighter than the other recommended heads, so it is a different balance rather than a stronger match on that trait."
    );
    expect(leadCard.benefits).toEqual([
      { code: "FORGIVENESS", text: "Forgiving for your game" },
    ]);
    expect(otherCard.benefits).toEqual([]);
    expect(leadCard.reason?.text).not.toMatch(/will |yards|guaranteed|perfect/i);
    expect(leadCard.confidenceLabel).toBe("High evidence confidence");
    expect(leadCard.assessedLabel).toBe("5 of 5 characteristics assessed");
  });

  it("does not invent a winner or a difference when Fit and dimensions match", () => {
    const shared = {
      catalogue_fit_score: 88,
      catalogue_match_band: "EXCELLENT_MATCH" as const,
      dimensions: {
        forgiveness: dim(true, 90),
        stability: dim(true, 90),
      },
      presentation_chars: {
        directional_bias: "NEUTRAL",
        primary_head_profile: "MAX_FORGIVENESS",
        launch_tendency: "MID",
      },
    };
    const a = score({ catalogue_key: "a", display_name: "Alpha Driver", ...shared });
    const b = score({ catalogue_key: "b", display_name: "Beta Driver", ...shared });
    const cards = presentNamedHeadCards(
      [a, b],
      [explanation("a", { reasons: [CATALOGUE_HEAD_REASON.FORGIVENESS] }), explanation("b", { reasons: [CATALOGUE_HEAD_REASON.FORGIVENESS] })],
      requirements({ forgiveness_requirement: 4 })
    );
    expect(cards.map((card) => card.role)).toEqual(["SIMILAR", "SIMILAR"]);
    expect(cards.map((card) => card.roleLabel)).toEqual([
      "Similarly Suitable",
      "Similarly Suitable",
    ]);
    expect(cards[0].headline).toBe("Similarly suited to your game.");
    expect(cards[0].reason?.text).toBe(cards[1].reason?.text);
    expect(cards[0].benefits).toEqual([]);
    expect(cards[0].reason?.text).not.toMatch(/higher|lower|better/i);
  });

  it("uses a recorded profile only when Fit is tied and the profile actually differs", () => {
    const base = {
      catalogue_fit_score: 88,
      catalogue_match_band: "EXCELLENT_MATCH" as const,
      dimensions: { forgiveness: dim(true, 90) },
    };
    const draw = score({
      catalogue_key: "draw",
      ...base,
      presentation_chars: {
        directional_bias: "STRONG_DRAW",
        primary_head_profile: "DRAW_BIASED",
        launch_tendency: "MID",
      },
    });
    const players = score({
      catalogue_key: "players",
      ...base,
      presentation_chars: {
        directional_bias: "FADE",
        primary_head_profile: "PLAYERS",
        launch_tendency: "MID",
      },
    });
    const cards = presentNamedHeadCards(
      [draw, players],
      [explanation("draw"), explanation("players")],
      requirements()
    );
    expect(cards[0].reason?.source).toBe("profile");
    expect(cards[0].reason?.text).toContain("draw-biased profile");
    expect(cards[0].reason?.text).toContain("not a ranking");
    expect(cards[1].reason?.text).toContain("players profile");
    expect(cards[0].role).toBe("SIMILAR");
  });

  it("uses a recorded profile chip when scores match and the catalogue profile differs", () => {
    const shared = {
      catalogue_fit_score: 88,
      catalogue_match_band: "EXCELLENT_MATCH" as const,
      dimensions: { forgiveness: dim(true, 90) },
    };
    const lowSpin = score({
      catalogue_key: "low",
      ...shared,
      presentation_chars: {
        directional_bias: "NEUTRAL",
        primary_head_profile: "LOW_SPIN",
        launch_tendency: "LOW",
      },
    });
    const forgiving = score({
      catalogue_key: "max",
      ...shared,
      presentation_chars: {
        directional_bias: "NEUTRAL",
        primary_head_profile: "MAX_FORGIVENESS",
        launch_tendency: "MID",
      },
    });
    const lower = score({
      catalogue_key: "lower",
      catalogue_fit_score: 70,
      catalogue_match_band: "GOOD_MATCH",
      dimensions: { forgiveness: dim(true, 60) },
      presentation_chars: {
        directional_bias: "NEUTRAL",
        primary_head_profile: "STANDARD",
        launch_tendency: "MID",
      },
    });
    const cards = presentNamedHeadCards(
      [lowSpin, forgiving, lower],
      [explanation("low"), explanation("max"), explanation("lower")],
      requirements({ forgiveness_requirement: 5 })
    );
    expect(cards[0].reason?.text).toBe(cards[1].reason?.text);
    expect(cards[0].reason?.text).not.toMatch(/higher|lower|better/i);
    expect(cards[0].benefits.map((benefit) => benefit.text)).toContain(
      "Recorded low-spin profile"
    );
    expect(cards[1].benefits.map((benefit) => benefit.text)).toContain(
      "Recorded high-forgiveness profile"
    );
  });

  it("keeps a single recommendation unlabeled as a leader", () => {
    const only = score({ catalogue_key: "only", dimensions: { forgiveness: dim(true, 90) } });
    const card = presentNamedHeadCards([only], [explanation("only", { reasons: [CATALOGUE_HEAD_REASON.FORGIVENESS] })], requirements())[0];
    expect(card.role).toBeNull();
    expect(card.reason?.text).toBe("Forgiveness looks consistent with what you told us.");
  });

  it("changes the primary benefit when the golfer's answers change", () => {
    const head = score({
      catalogue_key: "shape",
      dimensions: {
        forgiveness: dim(true, 92),
        workability: dim(true, 88),
      },
    });
    const forgiving = presentHeadCard(
      head,
      explanation("shape"),
      requirements({ forgiveness_requirement: 5 })
    );
    const workable = presentHeadCard(
      head,
      explanation("shape"),
      requirements({ workability_preference: 4 })
    );
    expect(forgiving.headline).toBe("A strong option if forgiveness is your priority.");
    expect(forgiving.reason?.code).toBe("FORGIVENESS");
    expect(workable.headline).toBe("Worth considering if you like to shape shots.");
    expect(workable.reason?.code).toBe("WORKABILITY");
    expect(forgiving.reason?.text).not.toBe(workable.reason?.text);
  });

  it("leads with the trait that actually separates two heads", () => {
    const forgiving = score({
      catalogue_key: "forgiving",
      dimensions: {
        forgiveness: dim(true, 96),
        workability: dim(true, 70),
      },
    });
    const workable = score({
      catalogue_key: "workable",
      dimensions: {
        forgiveness: dim(true, 74),
        workability: dim(true, 95),
      },
    });
    const req = requirements({
      forgiveness_requirement: 4,
      workability_preference: 4,
    });
    const cards = presentNamedHeadCards(
      [forgiving, workable],
      [explanation("forgiving"), explanation("workable")],
      req
    );
    expect(cards[0].reason?.code).toBe("FORGIVENESS");
    expect(cards[1].reason?.code).toBe("WORKABILITY");
    expect(cards[0].benefits.map((benefit) => benefit.code)).toEqual(["FORGIVENESS"]);
    expect(cards[1].benefits.map((benefit) => benefit.code)).toEqual(["WORKABILITY"]);
    expect(cards[0].reason?.text).not.toBe(cards[1].reason?.text);
  });

  it("does not invent a benefit from a missing characteristic or an unknown flight", () => {
    const head = score({
      catalogue_key: "thin",
      dimensions: {
        forgiveness: dim(false, null),
        head_launch: dim(true, 100),
      },
    });
    const card = presentHeadCard(
      head,
      explanation("thin"),
      requirements({
        forgiveness_requirement: 5,
        head_launch_target: "UNRESOLVED",
        head_launch_target_numeric: null,
      })
    );
    expect(card.headline).toBeNull();
    expect(card.benefits).toEqual([]);
    expect(card.reason?.text ?? "").not.toMatch(/forgiv|flight|launch/i);
  });

  it("keeps a medium-confidence recommendation from sounding certain", () => {
    const head = score({
      catalogue_key: "unsure",
      head_recommendation_confidence: "MEDIUM",
      active_catalogue_dim_count: 3,
      dimensions: { forgiveness: dim(true, 96) },
    });
    const card = presentHeadCard(
      head,
      explanation("unsure", { reasons: [CATALOGUE_HEAD_REASON.FORGIVENESS] }),
      requirements({ forgiveness_requirement: 5 }),
      [head]
    );
    expect(card.headline).toBe("Worth considering, with some evidence still open.");
    expect(card.benefits).toEqual([]);
    expect(card.reason?.text).toMatch(/evidence is still open/i);
    expect(card.reason?.text).not.toMatch(/guaranteed|will add|perfect|yards/i);
  });

  it("traces every benefit chip to an active dimension the golfer asked about", () => {
    const head = score({
      catalogue_key: "traced",
      dimensions: {
        forgiveness: dim(true, 90),
        stability: dim(true, 88),
        workability: dim(false, null),
        direction: dim(true, 40),
        head_launch: dim(true, 95),
      },
    });
    const req = requirements({
      forgiveness_requirement: 4,
      stability_requirement: 4,
      directional_target_numeric: 1,
      head_launch_target: "MID",
      head_launch_target_numeric: 2,
    });
    const card = presentHeadCard(head, explanation("traced"), req);
    expect(card.benefits.length).toBeGreaterThan(0);
    expect(card.benefits.length).toBeLessThanOrEqual(2);
    for (const benefit of card.benefits) {
      expect(benefit.text.length).toBeGreaterThan(0);
      const key =
        benefit.code === "FORGIVENESS"
          ? "forgiveness"
          : benefit.code === "STABILITY"
            ? "stability"
            : benefit.code === "WORKABILITY"
              ? "workability"
              : benefit.code === "DIRECTION"
                ? "direction"
                : "head_launch";
      expect(head.dimensions[key]?.active).toBe(true);
      expect(["DIRECTION"]).not.toContain(benefit.code);
    }
  });
});
