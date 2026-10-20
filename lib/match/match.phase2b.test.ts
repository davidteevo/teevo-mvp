import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import {
  attachInventoryToCatalogueRecommendations,
  CATALOGUE_RECOMMENDATION_KIND,
  loadMatchIntelligence,
  mapTeevoListingToInventoryItem,
  normalizeRequirements,
  runCatalogueRecommendation,
  scoreCandidate,
} from "@/lib/match";
import type { CatalogueHeadScore } from "@/lib/match/catalogue-types";
import type { MatchInventoryItem } from "@/lib/match/inventory/types";
import type { TeevoDriverListingRow } from "@/lib/match/inventory/teevo-listings";
import type { NormalisedRequirements } from "@/lib/match/types";

const REFERENCE = path.join(
  process.cwd(),
  "docs/teevo-match/driver-match-v1.1/reference"
);

const RICH = {
  handedness: "RIGHT" as const,
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
};

function stubRec(key: string): CatalogueHeadScore {
  return {
    kind: CATALOGUE_RECOMMENDATION_KIND,
    catalogue_key: key,
    brand: "Test",
    model: key,
    display_name: key,
    release_year: 2024,
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
  };
}

function baseItem(
  patch: Partial<MatchInventoryItem> & { source_listing_id: string }
): MatchInventoryItem {
  return {
    merchant_id: "seller-1",
    source_type: "TEEVO_LISTING",
    head_key: "ping|g430-sft|2023",
    shaft_key: null,
    listed_config: {
      brand: "PING",
      model: "G430 SFT",
      handedness: "RIGHT",
      stated_loft_deg: 10.5,
      shaft_label: null,
      shaft_flex_raw: null,
    },
    condition: "Good",
    price_minor: 25000,
    currency: "GBP",
    availability_status: "AVAILABLE",
    availability_checked_at: "2026-10-18T00:00:00.000Z",
    purchase_route: "TEEVO_CHECKOUT",
    identity: {
      head_resolution: "UNIQUE",
      shaft_resolution: "UNRESOLVED",
      evidence: ["brand:PING", "model:G430 SFT"],
    },
    ...patch,
  };
}

describe("Phase 2A Checkpoint B — inventory attach", () => {
  const intel = loadMatchIntelligence(REFERENCE);
  const req = {
    handedness: "RIGHT",
  } as NormalisedRequirements;

  it("attaches head-only with unverified shaft when shaft unresolved", () => {
    const key = "ping|g430-sft|2023";
    const attachments = attachInventoryToCatalogueRecommendations({
      recommendations: [stubRec(key)],
      inventory: [
        baseItem({
          source_listing_id: "L-head-only",
          head_key: key,
          shaft_key: null,
          identity: {
            head_resolution: "UNIQUE",
            shaft_resolution: "UNRESOLVED",
            evidence: [],
          },
        }),
      ],
      requirements: { ...req, handedness: "RIGHT" },
      intelligence: intel,
      golferConfidence: 80,
    });
    expect(attachments[0].items).toHaveLength(1);
    expect(attachments[0].items[0].attach_mode).toBe("HEAD_ONLY");
    expect(attachments[0].items[0].unverified_shaft).toBe(true);
    expect(attachments[0].items[0].listing_match).toBeNull();
  });

  it("skips ambiguous head identity", () => {
    const key = "ping|g430-sft|2023";
    const attachments = attachInventoryToCatalogueRecommendations({
      recommendations: [stubRec(key)],
      inventory: [
        baseItem({
          source_listing_id: "L-amb",
          head_key: null,
          identity: {
            head_resolution: "AMBIGUOUS",
            shaft_resolution: "UNRESOLVED",
            evidence: [],
          },
        }),
      ],
      requirements: { ...req, handedness: "RIGHT" },
      intelligence: intel,
      golferConfidence: 80,
    });
    expect(attachments[0].items).toHaveLength(0);
  });

  it("skips unknown or conflicting handedness", () => {
    const key = "ping|g430-sft|2023";
    const unknown = attachInventoryToCatalogueRecommendations({
      recommendations: [stubRec(key)],
      inventory: [
        baseItem({
          source_listing_id: "L-unk",
          head_key: key,
          listed_config: {
            brand: "PING",
            model: "G430",
            handedness: null,
            stated_loft_deg: 10.5,
            shaft_label: null,
            shaft_flex_raw: null,
          },
        }),
      ],
      requirements: { ...req, handedness: "RIGHT" },
      intelligence: intel,
      golferConfidence: 80,
    });
    expect(unknown[0].items).toHaveLength(0);

    const conflict = attachInventoryToCatalogueRecommendations({
      recommendations: [stubRec(key)],
      inventory: [
        baseItem({
          source_listing_id: "L-left",
          head_key: key,
          listed_config: {
            brand: "PING",
            model: "G430",
            handedness: "LEFT",
            stated_loft_deg: 10.5,
            shaft_label: null,
            shaft_flex_raw: null,
          },
        }),
      ],
      requirements: { ...req, handedness: "RIGHT" },
      intelligence: intel,
      golferConfidence: 80,
    });
    expect(conflict[0].items).toHaveLength(0);
  });

  it("empty inventory does not fail catalogue recommendations", () => {
    const result = runCatalogueRecommendation({
      skipUkMarketGate: true,
      answers: RICH,
      intelligence: intel,
      inventory: [],
    });
    expect(result.mode).toBe("NAMED_HEADS");
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.inventory_attachments.every((a) => a.items.length === 0)).toBe(
      true
    );
    expect(result.audit.inventory_items_attached).toBe(0);
  });

  it("attaches exact-key UNIQUE head inventory", () => {
    const key = "ping|g430-sft|2023";
    const attachments = attachInventoryToCatalogueRecommendations({
      recommendations: [stubRec(key)],
      inventory: [
        baseItem({
          source_listing_id: "L-exact",
          head_key: key,
          identity: {
            head_resolution: "UNIQUE",
            shaft_resolution: "UNRESOLVED",
            evidence: ["exact"],
          },
        }),
      ],
      requirements: { ...req, handedness: "RIGHT" },
      intelligence: intel,
      golferConfidence: 80,
    });
    expect(attachments[0].items).toHaveLength(1);
    expect(attachments[0].items[0].item.head_key).toBe(key);
    expect(attachments[0].items[0].item.identity.head_resolution).toBe("UNIQUE");
  });

  it("attaches matching LEFT and RIGHT handedness", () => {
    const key = "ping|g430-sft|2023";
    const right = attachInventoryToCatalogueRecommendations({
      recommendations: [stubRec(key)],
      inventory: [
        baseItem({
          source_listing_id: "L-right",
          head_key: key,
          listed_config: {
            brand: "PING",
            model: "G430 SFT",
            handedness: "RIGHT",
            stated_loft_deg: 10.5,
            shaft_label: null,
            shaft_flex_raw: null,
          },
        }),
      ],
      requirements: { ...req, handedness: "RIGHT" },
      intelligence: intel,
      golferConfidence: 80,
    });
    expect(right[0].items).toHaveLength(1);

    const left = attachInventoryToCatalogueRecommendations({
      recommendations: [stubRec(key)],
      inventory: [
        baseItem({
          source_listing_id: "L-left-ok",
          head_key: key,
          listed_config: {
            brand: "PING",
            model: "G430 SFT",
            handedness: "LEFT",
            stated_loft_deg: 10.5,
            shaft_label: null,
            shaft_flex_raw: null,
          },
        }),
      ],
      requirements: { ...req, handedness: "LEFT" },
      intelligence: intel,
      golferConfidence: 80,
    });
    expect(left[0].items).toHaveLength(1);
  });

  it("hard-asserts FULL_LISTING_MATCH when Phase 1 scoring succeeds", () => {
    const headKey = "adams|blue|2015";
    const head = intel.headsByKey[headKey];
    const requirements = normalizeRequirements(RICH, intel.headsByKey);
    let shaftKey: string | null = null;
    for (const shaft of intel.matchEligibleShafts) {
      const scored = scoreCandidate({
        listing: {
          listing_id: "probe",
          head_key: headKey,
          shaft_key: String(shaft.shaft_key),
          handedness: "RIGHT",
          stated_loft_deg: 10.5,
          publicly_purchasable: true,
          price_gbp: 200,
        },
        requirements,
        head,
        shaft,
        golferConfidence: 80,
      });
      if (
        !scored.excluded &&
        scored.scorable &&
        scored.raw_fit_score != null &&
        scored.match_band &&
        scored.confidence &&
        !scored.suppressed
      ) {
        shaftKey = String(shaft.shaft_key);
        break;
      }
    }
    expect(shaftKey).toBeTruthy();

    const attachments = attachInventoryToCatalogueRecommendations({
      recommendations: [stubRec(headKey)],
      inventory: [
        baseItem({
          source_listing_id: "L-full-hard",
          head_key: headKey,
          shaft_key: shaftKey,
          listed_config: {
            brand: "Adams",
            model: "Blue",
            handedness: "RIGHT",
            stated_loft_deg: 10.5,
            shaft_label: "Test Shaft",
            shaft_flex_raw: "S",
          },
          identity: {
            head_resolution: "UNIQUE",
            shaft_resolution: "UNIQUE",
            evidence: [],
          },
        }),
      ],
      requirements,
      intelligence: intel,
      golferConfidence: 80,
    });

    const row = attachments[0].items[0];
    expect(row.attach_mode).toBe("FULL_LISTING_MATCH");
    expect(row.listing_match).not.toBeNull();
    expect(row.unverified_shaft).toBe(false);
    expect(row.listing_match?.match_band).toBeTruthy();
  });

  it("skips non-purchasable inventory mapped as UNAVAILABLE", () => {
    const key = "ping|g430-sft|2023";
    const attachments = attachInventoryToCatalogueRecommendations({
      recommendations: [stubRec(key)],
      inventory: [
        baseItem({
          source_listing_id: "L-not-buyable",
          head_key: key,
          availability_status: "UNAVAILABLE",
        }),
      ],
      requirements: { ...req, handedness: "RIGHT" },
      intelligence: intel,
      golferConfidence: 80,
    });
    expect(attachments[0].items).toHaveLength(0);

    const mapped = mapTeevoListingToInventoryItem(
      {
        id: "sold-row",
        user_id: "u1",
        brand: "PING",
        model: "G430 SFT",
        title: "PING G430 SFT",
        handed: "right",
        degree: "10.5",
        degree_numeric: 10.5,
        shaft: null,
        shaft_flex: null,
        condition: "Good",
        price: 19900,
        status: "sold",
        archived_at: null,
        buying_paused: false,
        availability_confirmation_status: null,
      },
      intel
    );
    expect(mapped.availability_status).toBe("UNAVAILABLE");
  });

  it("never assigns a full listing Match badge to head-only rows", () => {
    const key = "ping|g430-sft|2023";
    const attachments = attachInventoryToCatalogueRecommendations({
      recommendations: [stubRec(key)],
      inventory: [
        baseItem({
          source_listing_id: "L-ho",
          head_key: key,
          shaft_key: null,
          identity: {
            head_resolution: "UNIQUE",
            shaft_resolution: "UNRESOLVED",
            evidence: [],
          },
        }),
      ],
      requirements: { ...req, handedness: "RIGHT" },
      intelligence: intel,
      golferConfidence: 80,
    });
    const row = attachments[0].items[0];
    expect(row.attach_mode).toBe("HEAD_ONLY");
    expect(row.listing_match).toBeNull();
    expect(row.unverified_shaft).toBe(true);
  });

  it("skips sold/reserved/archived-style unavailable inventory", () => {
    const key = "ping|g430-sft|2023";
    const unavailable = baseItem({
      source_listing_id: "L-sold",
      head_key: key,
      availability_status: "UNAVAILABLE",
    });
    const attachments = attachInventoryToCatalogueRecommendations({
      recommendations: [stubRec(key)],
      inventory: [unavailable],
      requirements: { ...req, handedness: "RIGHT" },
      intelligence: intel,
      golferConfidence: 80,
    });
    expect(attachments[0].items).toHaveLength(0);
  });

  it("maps realistic Teevo listing gates to AVAILABLE vs UNAVAILABLE", () => {
    const baseRow: TeevoDriverListingRow = {
      id: "row-1",
      user_id: "u1",
      brand: "PING",
      model: "G430 SFT",
      title: "PING G430 SFT",
      handed: "right",
      degree: "10.5",
      degree_numeric: 10.5,
      shaft: "Unknown",
      shaft_flex: "Regular",
      condition: "Good",
      price: 19900,
      status: "verified",
      archived_at: null,
      buying_paused: false,
      availability_confirmation_status: null,
    };
    expect(
      mapTeevoListingToInventoryItem(baseRow, intel).availability_status
    ).toBe("AVAILABLE");

    expect(
      mapTeevoListingToInventoryItem(
        { ...baseRow, id: "archived", archived_at: "2026-01-01T00:00:00Z" },
        intel
      ).availability_status
    ).toBe("UNAVAILABLE");

    expect(
      mapTeevoListingToInventoryItem(
        { ...baseRow, id: "paused", buying_paused: true },
        intel
      ).availability_status
    ).toBe("UNAVAILABLE");

    expect(
      mapTeevoListingToInventoryItem(
        { ...baseRow, id: "pending", status: "pending" },
        intel
      ).availability_status
    ).toBe("UNAVAILABLE");

    expect(
      mapTeevoListingToInventoryItem(
        {
          ...baseRow,
          id: "awaiting",
          availability_confirmation_status: "required",
        },
        intel
      ).availability_status
    ).toBe("UNAVAILABLE");

    expect(
      mapTeevoListingToInventoryItem(
        { ...baseRow, id: "sold-status", status: "sold" },
        intel
      ).availability_status
    ).toBe("UNAVAILABLE");
  });

  it("catalogue recommendations survive inventory loader failure (empty fallback)", () => {
    const result = runCatalogueRecommendation({
      skipUkMarketGate: true,
      answers: RICH,
      intelligence: intel,
      // Simulates API catch → inventory = []
      inventory: [],
    });
    expect(result.mode).toBe("NAMED_HEADS");
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.versions.inventory_attach).toBe("NONE");
  });

  it("admin recommend route requires requireAdmin before Match execution", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "app/api/admin/match/recommend/route.ts"),
      "utf8"
    );
    const adminAt = src.indexOf("requireAdmin");
    const runAt = src.indexOf("runCatalogueRecommendation");
    expect(adminAt).toBeGreaterThanOrEqual(0);
    expect(runAt).toBeGreaterThan(adminAt);
    expect(src).toContain('public_match_enabled: false');
  });
});
