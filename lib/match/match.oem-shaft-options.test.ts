import { describe, expect, it } from "vitest";
import path from "path";
import {
  loadMatchIntelligence,
  loadOemDriverConfigs,
  namedOemOfferingsForHead,
  normalizeRequirements,
  golferEvidenceConfidence,
  runCatalogueRecommendation,
  scoreCandidate,
  scoreCatalogueHead,
  scoreShaftCharacteristicDimensions,
  selectOemShaftOptionsForHeads,
  OEM_SHAFT_OPTIONS_KIND,
} from "@/lib/match";
import type { CatalogueHeadScore } from "@/lib/match/catalogue-types";
import type { InventoryListing } from "@/lib/match/types";
import { createHash } from "crypto";
import { readFileSync } from "fs";

const REFERENCE = path.join(
  process.cwd(),
  "docs/teevo-match/driver-match-v1.1/reference"
);

const G430 = "ping|g430-max|2023";

const intel = loadMatchIntelligence(REFERENCE);
const oem = loadOemDriverConfigs(REFERENCE, intel);

function answers(patch: Record<string, unknown>) {
  return {
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
    input_confidence: "HIGH",
    ...patch,
  };
}

function headStub(catalogue_key: string): CatalogueHeadScore {
  const head = intel.headsByKey[catalogue_key]!;
  return scoreCatalogueHead({
    head,
    requirements: normalizeRequirements(answers({}), intel.headsByKey),
    golferConfidence: 90,
  });
}

function optionsFor(
  catalogueKey: string,
  raw: Record<string, unknown>
) {
  const req = normalizeRequirements(raw, intel.headsByKey);
  const golfer = golferEvidenceConfidence(raw, req.conflict_flags);
  return selectOemShaftOptionsForHeads({
    heads: [headStub(catalogueKey)],
    requirements: req,
    intelligence: intel,
    oemConfigs: oem,
    golferConfidence: golfer,
    oemOverlayStatus: "LOADED",
  });
}

describe("Checkpoint C OEM shaft options", () => {
  it("Profile A — slower measured speed selects a softer/lighter PING OEM option", () => {
    const result = optionsFor(
      G430,
      answers({
        club_speed_mph: 78,
        speed_evidence: { method: "measured_mph", band: null },
        typical_trajectory: "HIGH",
        primary_objective: "HIGHER_FLIGHT",
      })
    );
    const row = result.by_head[0];
    expect(row.withheld_reason).toBeNull();
    expect(row.options.length).toBeGreaterThan(0);
    expect(row.options.length).toBeLessThanOrEqual(2);
    expect(row.options[0].kind).toBe(OEM_SHAFT_OPTIONS_KIND);
    expect(row.options[0].configuration_claim).toBe(
      "VERIFIED_OEM_OFFERING_ONLY"
    );
    expect(row.options[0].active_fitting_dimensions).toContain("flex");
    expect(
      row.options[0].active_fitting_dimensions.some(
        (d) => d === "weight" || d === "shaft_launch"
      )
    ).toBe(true);
    // Soft Regular / Regular ALTA should outrank Tour Black X for a slow swing.
    expect(row.options[0].shaft_key).toMatch(/alta-cb-black|tour-2-0-chrome/);
    expect(row.options[0].shaft_key).not.toMatch(/x-stiff/);
  });

  it("Profile B — moderate measured speed responds with mid flex territory options", () => {
    const result = optionsFor(
      G430,
      answers({
        club_speed_mph: 95,
        speed_evidence: { method: "measured_mph", band: null },
        typical_trajectory: "MID",
      })
    );
    const keys = result.by_head[0].options.map((o) => o.shaft_key);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.every((k) => k.startsWith("ping|"))).toBe(true);
    expect(
      result.by_head[0].options.every((o) => o.suitability_score != null && o.suitability_score >= 65)
    ).toBe(true);
  });

  it("Profile C — faster measured speed prefers firmer / lower-launch families", () => {
    const slow = optionsFor(
      G430,
      answers({
        club_speed_mph: 78,
        speed_evidence: { method: "measured_mph", band: null },
        typical_trajectory: "HIGH",
      })
    );
    const fast = optionsFor(
      G430,
      answers({
        club_speed_mph: 108,
        speed_evidence: { method: "measured_mph", band: null },
        typical_trajectory: "LOW",
        primary_objective: "LOWER_FLIGHT",
      })
    );
    expect(fast.by_head[0].options.length).toBeGreaterThan(0);
    expect(fast.by_head[0].options[0].shaft_key).not.toBe(
      slow.by_head[0].options[0]?.shaft_key
    );
    const fastFlex = Number(
      intel.shaftsByKey[fast.by_head[0].options[0].shaft_key]?.match_flex_value
    );
    const slowFlex = Number(
      intel.shaftsByKey[slow.by_head[0].options[0].shaft_key]?.match_flex_value
    );
    expect(fastFlex).toBeGreaterThanOrEqual(slowFlex);
  });

  it("Profile D — estimated speed keeps suitability but weaker flex evidence band", () => {
    const measuredRaw = answers({
      club_speed_mph: 95,
      speed_evidence: { method: "measured_mph", band: null },
      typical_trajectory: "MID",
    });
    const estimatedRaw = answers({
      club_speed_mph: 95,
      speed_evidence: { method: "estimated_mph", band: null },
      typical_trajectory: "MID",
    });
    const measuredReq = normalizeRequirements(measuredRaw, intel.headsByKey);
    const estimatedReq = normalizeRequirements(estimatedRaw, intel.headsByKey);
    expect(measuredReq.requirement_confidence.flex.source_codes).toContain(
      "MEASURED_SPEED"
    );
    expect(estimatedReq.requirement_confidence.flex.source_codes).toContain(
      "ESTIMATED_SPEED"
    );
    expect(estimatedReq.requirement_confidence.flex.band).not.toBe("HIGH");

    const measured = optionsFor(G430, measuredRaw);
    const estimated = optionsFor(G430, estimatedRaw);
    expect(measured.by_head[0].options[0]?.suitability_score).toBe(
      estimated.by_head[0].options[0]?.suitability_score
    );
  });

  it("Profile E — carry only does not invent shaft weight requirements", () => {
    const raw = answers({
      club_speed_mph: null,
      carry_distance_yards: 220,
      speed_evidence: { method: "carry_yards", band: null },
      typical_trajectory: "UNKNOWN",
      primary_objective: "DISTANCE",
    });
    // Direct requirement normalisation (bypass questionnaire enum) for carry-only.
    const req = normalizeRequirements(raw, intel.headsByKey);
    expect(req.shaft_weight_min_g).toBeNull();
    expect(req.shaft_weight_max_g).toBeNull();
    expect(req.shaft_flex_min_value).not.toBeNull();

    const result = optionsFor(G430, raw);
    // Flex alone is not enough for a personalised named recommendation.
    expect(result.by_head[0].options).toEqual([]);
    expect(result.by_head[0].withheld_reason).toBe(
      "NO_OPTION_PASSED_SHAFT_GATES"
    );
  });

  it("Profile F — unknown swing speed does not force a named shaft", () => {
    const result = optionsFor(
      G430,
      answers({
        club_speed_mph: null,
        carry_distance_yards: null,
        speed_evidence: { method: "unknown", band: null },
      })
    );
    expect(result.by_head[0].options).toEqual([]);
  });

  it("Profile G — non-PING recommended head keeps head Fit and general shaft guidance only", () => {
    const result = runCatalogueRecommendation({
      answers: answers({
        club_speed_mph: 85,
        speed_evidence: { method: "measured_mph", band: null },
        typical_start_direction: "RIGHT",
        typical_curvature: "RIGHT",
        miss_severity: "LARGE",
        primary_objective: "FORGIVENESS",
        handicap: 24,
      }),
      intelligence: intel,
      brandIds: ["wilson"],
    });
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(
      result.recommendations.every((h) =>
        String(h.brand).toLowerCase().includes("wilson")
      )
    ).toBe(true);
    expect(result.shaft_guidance.available).toBe(true);
    const named = (result.shaft_options ?? []).flatMap((row) => row.options);
    expect(named).toEqual([]);
  });

  it("Profile H — attaches shaft options to unranked example heads when verified", () => {
    const named = runCatalogueRecommendation({
      answers: answers({
        club_speed_mph: 95,
        speed_evidence: { method: "measured_mph", band: null },
      }),
      intelligence: intel,
      brandIds: ["ping"],
    });
    expect(
      named.recommendations.some((h) => h.catalogue_key === G430) ||
        (named.example_heads ?? []).some((h) => h.catalogue_key === G430)
    ).toBe(true);
    const g430Row = (named.shaft_options ?? []).find(
      (row) => row.catalogue_key === G430
    );
    expect(g430Row?.options.length).toBeGreaterThan(0);

    // Explicit unranked path: selection attaches to example_heads independently
    // of Best Match labelling.
    const unranked = selectOemShaftOptionsForHeads({
      heads: [headStub(G430), headStub("ping|g430-sft|2023")],
      requirements: normalizeRequirements(
        answers({
          club_speed_mph: 95,
          speed_evidence: { method: "measured_mph", band: null },
          typical_trajectory: "MID",
        }),
        intel.headsByKey
      ),
      intelligence: intel,
      oemConfigs: oem,
      golferConfidence: 90,
      oemOverlayStatus: "LOADED",
    });
    expect(unranked.by_head).toHaveLength(2);
    expect(
      unranked.by_head.find((row) => row.catalogue_key === G430)?.options.length
    ).toBeGreaterThan(0);
  });

  it("does not return two flex variants of the same shaft family", () => {
    const result = optionsFor(
      G430,
      answers({
        club_speed_mph: 95,
        speed_evidence: { method: "measured_mph", band: null },
        typical_trajectory: "MID",
      })
    );
    const families = result.by_head[0].options.map(
      (o) => o.diagnostics.shaft_family_key
    );
    expect(new Set(families).size).toBe(families.length);
  });

  it("PING OEM coverage does not change head Fit scores or order", () => {
    const withPingBrand = runCatalogueRecommendation({
      answers: answers({
        club_speed_mph: 95,
        speed_evidence: { method: "measured_mph", band: null },
      }),
      intelligence: intel,
      brandIds: ["ping"],
    });
    const keys = withPingBrand.recommendations.map((h) => h.catalogue_key);
    const fits = withPingBrand.recommendations.map((h) => h.catalogue_fit_score);
    // Re-run: deterministic and shaft_options must not reorder heads.
    const again = runCatalogueRecommendation({
      answers: answers({
        club_speed_mph: 95,
        speed_evidence: { method: "measured_mph", band: null },
      }),
      intelligence: intel,
      brandIds: ["ping"],
    });
    expect(again.recommendations.map((h) => h.catalogue_key)).toEqual(keys);
    expect(again.recommendations.map((h) => h.catalogue_fit_score)).toEqual(fits);
    expect(again.versions.oem_shaft_options).toBe("PHASE_3A_CHECKPOINT_C");
  });

  it("excludes recognition-only and aftermarket-collision offerings from named options", () => {
    const named = namedOemOfferingsForHead(oem, "taylormade|sim-max|2020");
    expect(named).toEqual([]);
    const sim = optionsFor(
      "taylormade|sim-max|2020",
      answers({
        club_speed_mph: 95,
        speed_evidence: { method: "measured_mph", band: null },
      })
    );
    expect(sim.by_head[0].options).toEqual([]);
  });

  it("never claims a verified complete configuration or inventory availability", () => {
    const result = optionsFor(
      G430,
      answers({
        club_speed_mph: 95,
        speed_evidence: { method: "measured_mph", band: null },
        typical_trajectory: "MID",
      })
    );
    for (const option of result.by_head[0].options) {
      expect(option.configuration_claim).toBe("VERIFIED_OEM_OFFERING_ONLY");
      expect(option.limitations).toContain(
        "NOT_A_VERIFIED_COMPLETE_DRIVER_CONFIGURATION"
      );
      expect(option.limitations).toContain("NOT_AN_INVENTORY_AVAILABILITY_CLAIM");
      expect(option.dimensions.shaft_spin.active).toBe(false);
    }
  });

  it("keeps listing-level scoreCandidate outputs identical after shaft extraction", () => {
    const head = intel.headsByKey[G430]!;
    const shaft = intel.shaftsByKey["ping|alta-cb-black|2023|55|regular"]!;
    const req = normalizeRequirements(
      answers({
        club_speed_mph: 95,
        speed_evidence: { method: "measured_mph", band: null },
        typical_trajectory: "MID",
      }),
      intel.headsByKey
    );
    const listing: InventoryListing = {
      listing_id: "listing-regression",
      publicly_purchasable: true,
      handedness: "RIGHT",
      stated_loft_deg: 10.5,
      shaft_key: "ping|alta-cb-black|2023|55|regular",
      head_key: G430,
      price_gbp: 199,
      condition: "Good",
    } as InventoryListing;
    const a = scoreCandidate({
      listing,
      requirements: req,
      head,
      shaft,
      golferConfidence: 90,
    });
    const b = scoreCandidate({
      listing,
      requirements: req,
      head,
      shaft,
      golferConfidence: 90,
    });
    expect(a.raw_fit_score).toBe(b.raw_fit_score);
    expect(a.dimensions?.flex).toEqual(b.dimensions?.flex);
    expect(a.dimensions?.weight).toEqual(b.dimensions?.weight);
    expect(a.dimensions?.shaft_launch).toEqual(b.dimensions?.shaft_launch);
    expect(a.dimensions?.shaft_spin?.active).toBe(false);

    const shared = scoreShaftCharacteristicDimensions(req, shaft);
    expect(a.dimensions?.flex).toEqual(shared.dimensions.flex);
    expect(a.dimensions?.weight).toEqual(shared.dimensions.weight);
    expect(a.dimensions?.shaft_launch).toEqual(shared.dimensions.shaft_launch);
  });

  it("does not alter frozen dataset hashes", () => {
    const heads = createHash("sha1")
      .update(readFileSync(path.join(REFERENCE, "heads.json")))
      .digest("hex");
    const shafts = createHash("sha1")
      .update(readFileSync(path.join(REFERENCE, "shafts.json")))
      .digest("hex");
    expect(heads).toBe("1e4c0711732515e6df74a4d586eaa95da1cbf0f4");
    expect(shafts).toBe("d77c369f734d212236acdff88b86ddcf0a3af1d4");
  });
});
