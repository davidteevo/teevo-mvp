import { describe, expect, it } from "vitest";
import path from "path";
import {
  collectHeadIdentityMatches,
  collectShaftIdentityMatches,
  loadMatchIntelligence,
  planListingLoft,
  resolveIdentity,
  resolveHeadIdentity,
  runMatchSession,
  scoreCandidate,
} from "@/lib/match";
import type { NormalisedRequirements } from "@/lib/match/types";

const REFERENCE = path.join(
  process.cwd(),
  "docs/teevo-match/driver-match-v1.1/reference"
);

describe("match intelligence immutability", () => {
  it("freezes eligibleHeads and matchEligibleShafts records", () => {
    const intel = loadMatchIntelligence(REFERENCE);
    expect(Object.isFrozen(intel)).toBe(true);
    expect(Object.isFrozen(intel.eligibleHeads)).toBe(true);
    expect(Object.isFrozen(intel.matchEligibleShafts)).toBe(true);
    expect(intel.eligibleHeads.length).toBeGreaterThan(0);
    expect(Object.isFrozen(intel.eligibleHeads[0])).toBe(true);
    expect(intel.matchEligibleShafts.length).toBeGreaterThan(0);
    expect(Object.isFrozen(intel.matchEligibleShafts[0])).toBe(true);

    expect(() => {
      (intel.eligibleHeads as unknown as { push: (x: unknown) => void }).push(
        {}
      );
    }).toThrow();
    expect(() => {
      (intel.eligibleHeads[0] as unknown as { brand?: string }).brand =
        "mutated";
    }).toThrow();
  });
});

describe("full-reference identity lookup", () => {
  it("keeps recognition-only matches so eligible-only uniqueness is not invented", () => {
    const resolution = resolveIdentity([
      { key: "eligible", eligibility: "MATCH_ELIGIBLE" },
      { key: "recognition", eligibility: "RECOGNITION_ONLY" },
    ]);
    expect(resolution).toEqual({
      resolved_key: null,
      eligible: false,
      reason: "AMBIGUOUS_IDENTITY",
    });
  });

  it("resolves G400 Max via aliases without requiring listing year", () => {
    const intel = loadMatchIntelligence(REFERENCE);
    const matches = collectHeadIdentityMatches(
      { brand: "PING", model: "G400 Max" },
      intel.heads
    );
    const resolution = resolveHeadIdentity(
      { brand: "PING", model: "G400 Max" },
      intel.heads
    );
    expect(matches.some((m) => m.key === "ping|g400-max|2018")).toBe(true);
    expect(resolution.resolved_key).toBe("ping|g400-max|2018");
    expect(resolution.eligible).toBe(true);
  });

  it("does not treat bare shaft brand+model as an exact MATCH_ELIGIBLE variant", () => {
    const intel = loadMatchIntelligence(REFERENCE);
    const matches = collectShaftIdentityMatches(
      { shaft: "Fujikura Air Speeder" },
      intel.shafts
    );
    // Exact display/alias only — bare family name must not invent flex/weight.
    const eligible = matches.filter((m) => m.eligibility === "MATCH_ELIGIBLE");
    expect(eligible.length).toBe(0);
  });

  it("preserves quarantined/excluded shaft hits in the pre-eligibility match set", () => {
    const matches = collectShaftIdentityMatches(
      { shaft: "Demo Quarantined Speeder" },
      [
        {
          shaft_key: "demo|eligible|2020|50|s",
          match_eligibility: "MATCH_ELIGIBLE",
          display_name: "Demo Quarantined Speeder Stiff",
          aliases: "",
        },
        {
          shaft_key: "demo|quarantined|2020|50|s",
          match_eligibility: "QUARANTINED",
          display_name: "Demo Quarantined Speeder",
          aliases: "Demo Quarantined Speeder",
        },
        {
          shaft_key: "demo|excluded|2020|50|s",
          match_eligibility: "EXCLUDED_SCOPE",
          display_name: "Other",
          aliases: "Demo Quarantined Speeder",
        },
      ]
    );
    expect(matches.map((m) => m.eligibility).sort()).toEqual([
      "EXCLUDED_SCOPE",
      "QUARANTINED",
    ]);
    const resolution = resolveIdentity(matches);
    expect(resolution.reason).toBe("AMBIGUOUS_IDENTITY");
    expect(resolution.eligible).toBe(false);
  });
});

describe("listing confidence loft deductions", () => {
  const baseReq = {
    handedness: "RIGHT",
    recommendation_intent: "UNANCHORED",
    head_launch_target: "UNRESOLVED",
    head_launch_target_numeric: null,
    head_spin_target: "UNRESOLVED",
    forgiveness_requirement: 3,
    stability_requirement: 3,
    directional_target_numeric: null,
    directional_requirement: "UNRESOLVED",
    workability_preference: 2,
    driver_subtype_allowed: "STANDARD",
    preferred_loft_min_deg: 9,
    preferred_loft_max_deg: 10,
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
  } as NormalisedRequirements;

  it("plans legacy delta when structured hosel fields are absent", () => {
    const plan = planListingLoft(
      {
        hosel_loft_adjustment_type: "DELTA_RANGE",
        loft_adjustment_min_deg: -1,
        loft_adjustment_max_deg: 1,
      },
      10.5
    );
    expect(plan.usedLegacyDelta).toBe(true);
    expect(plan.min).toBe(-1);
    expect(plan.max).toBe(1);
  });

  it("deducts for legacy loft delta when adjustment is required for target access", () => {
    const intel = loadMatchIntelligence(REFERENCE);
    const head = {
      ...intel.headsByKey["adams|blue|2015"],
      hosel_loft_adjustment_type: "DELTA_RANGE",
      hosel_loft_setting_min_deg: null,
      hosel_loft_setting_max_deg: null,
      hosel_loft_settings: null,
      loft_adjustment_min_deg: -1,
      loft_adjustment_max_deg: 1,
      forgiveness: 5,
      forgiveness_confidence: "HIGH",
      stability: 5,
      stability_confidence: "HIGH",
      workability: 2,
      workability_confidence: "HIGH",
    };
    const shaft = intel.matchEligibleShafts[0];
    const scored = scoreCandidate({
      listing: {
        listing_id: "legacy-delta",
        head_key: String(head.catalogue_key),
        shaft_key: String(shaft.shaft_key),
        handedness: "RIGHT",
        stated_loft_deg: 10.5,
        publicly_purchasable: true,
        price_gbp: 200,
      },
      requirements: baseReq,
      head,
      shaft,
      golferConfidence: 100,
    });
    expect(scored.excluded).toBe(false);
    expect(scored.considerations).toContain("LOFT_ADJUSTABLE_INTO_TARGET");
    expect(scored.listing_confidence_deductions).toEqual(
      expect.arrayContaining([
        { code: "LISTING_LEGACY_LOFT_DELTA", amount: 5 },
      ])
    );
    expect(scored.confidence_components?.listing).toBeLessThanOrEqual(95);
  });

  it("deducts for unknown hosel when stated loft is outside the active target", () => {
    const intel = loadMatchIntelligence(REFERENCE);
    const head = {
      ...intel.headsByKey["adams|blue|2015"],
      hosel_loft_adjustment_type: "UNKNOWN",
      forgiveness: 5,
      forgiveness_confidence: "HIGH",
      stability: 5,
      stability_confidence: "HIGH",
      workability: 2,
      workability_confidence: "HIGH",
    };
    const shaft = intel.matchEligibleShafts[0];
    const scored = scoreCandidate({
      listing: {
        listing_id: "unknown-hosel",
        head_key: String(head.catalogue_key),
        shaft_key: String(shaft.shaft_key),
        handedness: "RIGHT",
        stated_loft_deg: 12,
        publicly_purchasable: true,
        price_gbp: 200,
      },
      requirements: baseReq,
      head,
      shaft,
      golferConfidence: 100,
    });
    expect(scored.listing_confidence_deductions).toEqual(
      expect.arrayContaining([
        { code: "LISTING_UNKNOWN_HOSEL_RANGE", amount: 5 },
      ])
    );
  });
});

describe("brand filter on session pipeline", () => {
  it("scopes presentation without changing Fit/confidence or requirements", () => {
    const intel = loadMatchIntelligence(REFERENCE);
    const adams = intel.headsByKey["adams|blue|2015"];
    const ping = intel.heads.find(
      (h) =>
        String(h.brand || "").toLowerCase() === "ping" &&
        h.match_eligible === "TRUE" &&
        h.driver_subtype === "STANDARD"
    );
    expect(adams && ping).toBeTruthy();
    const shaft = intel.matchEligibleShafts[0];

    const inventory = [
      {
        listing_id: "a",
        head_key: String(adams!.catalogue_key),
        shaft_key: String(shaft.shaft_key),
        handedness: "RIGHT",
        stated_loft_deg: 10.5,
        publicly_purchasable: true,
        price_gbp: 180,
      },
      {
        listing_id: "p",
        head_key: String(ping!.catalogue_key),
        shaft_key: String(shaft.shaft_key),
        handedness: "RIGHT",
        stated_loft_deg: 10.5,
        publicly_purchasable: true,
        price_gbp: 300,
      },
    ];

    const raw = {
      handedness: "RIGHT",
      handicap: 10,
      club_speed_mph: 95,
      ball_speed_mph: null,
      launch_angle_deg: null,
      spin_rate_rpm: null,
      attack_angle_deg: null,
      carry_distance_yards: null,
      typical_trajectory: "MID",
      typical_start_direction: "CENTRE",
      typical_curvature: "STRAIGHT",
      miss_severity: "MODERATE",
      strike_pattern: "CENTRE",
      strike_consistency: "MEDIUM",
      current_driver_key: null,
      current_loft_deg: null,
      current_shaft_key: null,
      current_flex_raw: null,
      current_club_satisfaction: "UNKNOWN",
      primary_objective: "DISTANCE",
      budget_max_gbp: 400,
      input_source: "QUESTIONNAIRE",
      input_confidence: "HIGH",
    };

    const all = runMatchSession({
      raw_inputs: raw,
      inventory,
      intelligence: intel,
    });
    const filtered = runMatchSession({
      raw_inputs: raw,
      inventory,
      intelligence: intel,
      marketplace_preferences: { brand_ids: ["ping"] },
    });

    expect(filtered.normalised_requirements).not.toHaveProperty("brand_ids");
    expect(
      "brand_ids" in filtered.normalised_requirements
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (filtered.normalised_requirements as any).brand_ids
        : undefined
    ).toBeUndefined();
    expect(filtered.marketplace_preferences.brand_ids).toEqual(["ping"]);
    expect(filtered.presentation.scope).toBe("SELECTED_BRANDS");

    // Fit/confidence snapshots unchanged for the same listing ids.
    for (const id of ["a", "p"]) {
      const before = all.candidates.find((c) => c.listing_id === id)!;
      const after = filtered.candidates.find((c) => c.listing_id === id)!;
      expect(after.raw_fit_score).toBe(before.raw_fit_score);
      expect(after.confidence_score).toBe(before.confidence_score);
      expect(after.match_band).toBe(before.match_band);
    }

    expect(filtered.presentation.cards.every((c) => c.listing_id === "p")).toBe(
      true
    );
  });
});
