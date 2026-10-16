import { describe, expect, it } from "vitest";
import path from "path";
import {
  brandMarketplace,
  buildBrandRegistry,
  collectHeadIdentityMatches,
  collectShaftIdentityMatches,
  loadMatchIntelligence,
  planListingLoft,
  resolveHeadIdentity,
  resolveIdentity,
  resolveShaftIdentity,
  runMatchSession,
  scoreCandidate,
  validateBrandSelection,
} from "@/lib/match";
import type { NormalisedRequirements } from "@/lib/match/types";

const REFERENCE = path.join(
  process.cwd(),
  "docs/teevo-match/driver-match-v1.1/reference"
);

const RAW_BASE = {
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

function sparseReq(
  patch: Partial<NormalisedRequirements> = {}
): NormalisedRequirements {
  return {
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
    requirement_confidence:
      {} as NormalisedRequirements["requirement_confidence"],
    ...patch,
  };
}

describe("canonical brand registry", () => {
  it("derives stable IDs from the full frozen head universe", () => {
    const intel = loadMatchIntelligence(REFERENCE);
    expect(intel.brandRegistry.ids.has("ping")).toBe(true);
    expect(intel.brandRegistry.ids.has("taylormade")).toBe(true);
    expect(intel.brandRegistry.byId.ping?.label.toLowerCase()).toContain("ping");
    // Registry includes brands even if only non-eligible rows exist for some labels
    const rebuilt = buildBrandRegistry(intel.heads);
    expect(Array.from(rebuilt.ids).sort()).toEqual(
      Array.from(intel.brandRegistry.ids).sort()
    );
  });

  it("treats null and [] as all brands; rejects unknown IDs without broadening", () => {
    const intel = loadMatchIntelligence(REFERENCE);
    expect(validateBrandSelection(null, intel.brandRegistry)).toEqual({
      ok: true,
      brand_ids: [],
      scope: "ALL_BRANDS",
    });
    expect(validateBrandSelection([], intel.brandRegistry)).toEqual({
      ok: true,
      brand_ids: [],
      scope: "ALL_BRANDS",
    });
    const bad = validateBrandSelection(
      ["ping", "not-a-brand"],
      intel.brandRegistry
    );
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.error).toBe("INVALID_BRAND_SELECTION");
      expect(bad.invalid_ids).toEqual(["not-a-brand"]);
    }
  });

  it("dedupes and sorts valid selections; stage probes keep INVALID error", () => {
    const intel = loadMatchIntelligence(REFERENCE);
    const ok = validateBrandSelection(
      ["taylormade", "ping", "ping"],
      intel.brandRegistry
    );
    expect(ok).toEqual({
      ok: true,
      brand_ids: ["ping", "taylormade"],
      scope: "SELECTED_BRANDS",
    });
    const stage = brandMarketplace({
      selected_brand_ids: ["not-a-brand"],
      known_brand_ids: Array.from(intel.brandRegistry.ids),
      candidates: [],
      budget: 300,
    });
    expect(stage).toMatchObject({ error: "INVALID_BRAND_SELECTION" });
  });

  it("does not apply all-brand cards when session brand IDs are invalid", () => {
    const intel = loadMatchIntelligence(REFERENCE);
    const head = intel.headsByKey["adams|blue|2015"];
    const shaft = intel.matchEligibleShafts[0];
    const session = runMatchSession({
      raw_inputs: RAW_BASE,
      inventory: [
        {
          listing_id: "a",
          head_key: String(head.catalogue_key),
          shaft_key: String(shaft.shaft_key),
          handedness: "RIGHT",
          stated_loft_deg: 10.5,
          publicly_purchasable: true,
          price_gbp: 180,
        },
      ],
      intelligence: intel,
      marketplace_preferences: { brand_ids: ["not-a-brand"] },
    });
    expect(session.error).toBe("INVALID_BRAND_SELECTION");
    expect(session.presentation.cards).toEqual([]);
    expect(session.presentation.state).toBe("INVALID_BRAND_SELECTION");
    expect(session.candidates[0]?.excluded).toBe(false);
    expect(session.normalised_requirements).not.toHaveProperty("brand_ids");
  });

  it("never changes Fit or confidence traces when filtering by brand", () => {
    const intel = loadMatchIntelligence(REFERENCE);
    const adams = intel.headsByKey["adams|blue|2015"];
    const ping = intel.heads.find(
      (h) =>
        String(h.brand || "").toLowerCase() === "ping" &&
        h.match_eligible === "TRUE" &&
        h.driver_subtype === "STANDARD"
    )!;
    const shaft = intel.matchEligibleShafts[0];
    const inventory = [
      {
        listing_id: "a",
        head_key: String(adams.catalogue_key),
        shaft_key: String(shaft.shaft_key),
        handedness: "RIGHT",
        stated_loft_deg: 10.5,
        publicly_purchasable: true,
        price_gbp: 180,
      },
      {
        listing_id: "p",
        head_key: String(ping.catalogue_key),
        shaft_key: String(shaft.shaft_key),
        handedness: "RIGHT",
        stated_loft_deg: 10.5,
        publicly_purchasable: true,
        price_gbp: 300,
      },
    ];
    const all = runMatchSession({
      raw_inputs: RAW_BASE,
      inventory,
      intelligence: intel,
    });
    const filtered = runMatchSession({
      raw_inputs: RAW_BASE,
      inventory,
      intelligence: intel,
      marketplace_preferences: { brand_ids: ["ping"] },
    });
    for (const id of ["a", "p"]) {
      const before = all.candidates.find((c) => c.listing_id === id)!;
      const after = filtered.candidates.find((c) => c.listing_id === id)!;
      expect(after.raw_fit_score).toBe(before.raw_fit_score);
      expect(after.confidence_score).toBe(before.confidence_score);
      expect(after.confidence_components).toEqual(before.confidence_components);
    }
  });
});

describe("identity resolution edge cases", () => {
  it("does not silently pick an eligible head when recognition-only also matches", () => {
    const matches = collectHeadIdentityMatches(
      { brand: "Demo", model: "Twin" },
      [
        {
          catalogue_key: "demo|twin|2020",
          brand: "Demo",
          model: "Twin",
          intelligence_version: "DRIVER_V1",
          match_eligible: "TRUE",
          driver_subtype: "STANDARD",
          category: "DRIVER",
        },
        {
          catalogue_key: "demo|twin-proto|2019",
          brand: "Demo",
          model: "Twin Proto",
          aliases: "Demo Twin|Twin",
          intelligence_version: "DRIVER_V1",
          match_eligible: "FALSE",
          driver_subtype: "STANDARD",
          category: "DRIVER",
        },
      ]
    );
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(resolveIdentity(matches).reason).toBe("AMBIGUOUS_IDENTITY");
  });

  it("keeps Qi35 ambiguous across generations without inventing a year", () => {
    const intel = loadMatchIntelligence(REFERENCE);
    const resolution = resolveHeadIdentity(
      { brand: "TaylorMade", model: "Qi35" },
      intel.heads
    );
    // Multiple catalogue keys share this model identity without listing year.
    expect(resolution.eligible).toBe(false);
    expect(
      resolution.reason === "AMBIGUOUS_IDENTITY" ||
        resolution.reason === "UNRESOLVED_IDENTITY"
    ).toBe(true);
    if (resolution.reason === "AMBIGUOUS_IDENTITY") {
      expect(resolution.resolved_key).toBeNull();
    }
  });

  it("never infers MATCH_ELIGIBLE shaft flex/weight from bare brand+model text", () => {
    const intel = loadMatchIntelligence(REFERENCE);
    const matches = collectShaftIdentityMatches(
      { shaft: "Fujikura Air Speeder" },
      intel.shafts
    );
    expect(matches.every((m) => m.eligibility !== "MATCH_ELIGIBLE")).toBe(true);
    expect(resolveShaftIdentity({ shaft: "Fujikura Air Speeder" }, intel.shafts)
      .eligible).toBe(false);
  });

  it("requires flex+weight evidence for multi-field shaft uniqueness", () => {
    const shafts = [
      {
        shaft_key: "demo|speeder|2020|50|s",
        match_eligibility: "MATCH_ELIGIBLE",
        manufacturer: "Demo",
        model: "Speeder",
        flex: "S",
        actual_weight_g: 50,
        display_name: "Demo Speeder 50 S",
        aliases: "",
      },
      {
        shaft_key: "demo|speeder|2020|60|s",
        match_eligibility: "MATCH_ELIGIBLE",
        manufacturer: "Demo",
        model: "Speeder",
        flex: "S",
        actual_weight_g: 60,
        display_name: "Demo Speeder 60 S",
        aliases: "",
      },
    ];
    const bare = collectShaftIdentityMatches(
      { manufacturer: "Demo", model: "Speeder" },
      shafts
    );
    expect(bare).toEqual([]);
    const exact = collectShaftIdentityMatches(
      {
        manufacturer: "Demo",
        model: "Speeder",
        flex: "S",
        actual_weight_g: 50,
      },
      shafts
    );
    expect(exact).toEqual([
      { key: "demo|speeder|2020|50|s", eligibility: "MATCH_ELIGIBLE" },
    ]);
  });
});

describe("confidence vs fit separation", () => {
  it("applies legacy loft and unknown hosel -5 deductions once without changing Fit", () => {
    const intel = loadMatchIntelligence(REFERENCE);
    const shaft = intel.matchEligibleShafts[0];
    const req = sparseReq();

    const legacyHead = {
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
    const legacy = scoreCandidate({
      listing: {
        listing_id: "legacy",
        head_key: String(legacyHead.catalogue_key),
        shaft_key: String(shaft.shaft_key),
        handedness: "RIGHT",
        stated_loft_deg: 10.5,
        publicly_purchasable: true,
        price_gbp: 200,
      },
      requirements: req,
      head: legacyHead,
      shaft,
      golferConfidence: 100,
    });
    const legacyCodes = (legacy.listing_confidence_deductions || []).map(
      (d) => d.code
    );
    expect(legacyCodes.filter((c) => c === "LISTING_LEGACY_LOFT_DELTA")).toEqual([
      "LISTING_LEGACY_LOFT_DELTA",
    ]);
    expect(legacy.raw_fit_score).toBeTypeOf("number");

    // Same reachability via structured hosel fields must not take the legacy deduction.
    const structuredHead = {
      ...legacyHead,
      hosel_loft_setting_min_deg: -1,
      hosel_loft_setting_max_deg: 1,
    };
    expect(planListingLoft(structuredHead, 10.5).usedLegacyDelta).toBe(false);
    const structured = scoreCandidate({
      listing: {
        listing_id: "structured",
        head_key: String(structuredHead.catalogue_key),
        shaft_key: String(shaft.shaft_key),
        handedness: "RIGHT",
        stated_loft_deg: 10.5,
        publicly_purchasable: true,
        price_gbp: 200,
      },
      requirements: req,
      head: structuredHead,
      shaft,
      golferConfidence: 100,
    });
    expect(structured.raw_fit_score).toBe(legacy.raw_fit_score);
    expect(
      (structured.listing_confidence_deductions || []).some(
        (d) => d.code === "LISTING_LEGACY_LOFT_DELTA"
      )
    ).toBe(false);
    // Listing confidence may differ; Fit must not.
    expect(structured.confidence_components?.listing).toBeGreaterThan(
      legacy.confidence_components!.listing
    );

    const unknownHead = {
      ...intel.headsByKey["adams|blue|2015"],
      hosel_loft_adjustment_type: "UNKNOWN",
      forgiveness: 5,
      forgiveness_confidence: "HIGH",
      stability: 5,
      stability_confidence: "HIGH",
      workability: 2,
      workability_confidence: "HIGH",
    };
    const unknown = scoreCandidate({
      listing: {
        listing_id: "unknown",
        head_key: String(unknownHead.catalogue_key),
        shaft_key: String(shaft.shaft_key),
        handedness: "RIGHT",
        stated_loft_deg: 12,
        publicly_purchasable: true,
        price_gbp: 200,
      },
      requirements: req,
      head: unknownHead,
      shaft,
      golferConfidence: 100,
    });
    expect(unknown.listing_confidence_deductions).toEqual([
      { code: "LISTING_UNKNOWN_HOSEL_RANGE", amount: 5 },
    ]);
  });
});

describe("reproducibility and freeze integrity", () => {
  it("returns identical results for identical inputs and intelligence versions", () => {
    const intel = loadMatchIntelligence(REFERENCE);
    const head = intel.headsByKey["adams|blue|2015"];
    const shaft = intel.matchEligibleShafts[0];
    const inventory = [
      {
        listing_id: "only",
        head_key: String(head.catalogue_key),
        shaft_key: String(shaft.shaft_key),
        handedness: "RIGHT",
        stated_loft_deg: 10.5,
        publicly_purchasable: true,
        price_gbp: 200,
      },
    ];
    const a = runMatchSession({
      raw_inputs: RAW_BASE,
      inventory,
      intelligence: intel,
    });
    const b = runMatchSession({
      raw_inputs: RAW_BASE,
      inventory,
      intelligence: intel,
    });
    expect(a.versions).toEqual(b.versions);
    expect(a.normalised_requirements).toEqual(b.normalised_requirements);
    expect(a.candidates).toEqual(b.candidates);
    expect(a.presentation).toEqual(b.presentation);
    expect(a.marketplace_preferences).toEqual(b.marketplace_preferences);
  });

  it("blocks mutation through exported intelligence references", () => {
    const intel = loadMatchIntelligence(REFERENCE);
    expect(() => {
      (intel.brandRegistry.entries as unknown as BrandRegistryEntryMutable[]).push({
        id: "x",
        label: "X",
      });
    }).toThrow();
    expect(() => {
      (intel.brandRegistry.ids as Set<string>).add("injected-brand");
    }).toThrow();
    expect(intel.brandRegistry.ids.has("injected-brand")).toBe(false);
    expect(() => {
      (intel.headsByKey["adams|blue|2015"] as unknown as { brand: string }).brand =
        "Hacked";
    }).toThrow();
  });
});

type BrandRegistryEntryMutable = { id: string; label: string };
