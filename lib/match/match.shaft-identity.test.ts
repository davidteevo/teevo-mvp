import { createHash } from "crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { attachInventoryToCatalogueRecommendations } from "@/lib/match/app/inventory-attach";
import { CATALOGUE_RECOMMENDATION_KIND } from "@/lib/match/catalogue-types";
import type { CatalogueHeadScore } from "@/lib/match/catalogue-types";
import {
  collectShaftIdentityMatches,
  resolveShaftIdentity,
} from "@/lib/match/identity";
import { loadMatchIntelligence } from "@/lib/match/intelligence/load";
import type { TeevoDriverListingRow } from "@/lib/match/inventory/teevo-listings";
import { mapTeevoListingToInventoryItem } from "@/lib/match/inventory/teevo-listings";
import { normalizeRequirements } from "@/lib/match/requirements";
import { scoreCandidate } from "@/lib/match/scoring/candidate";
import {
  loadShaftIdentitySupplement,
  validateShaftIdentitySupplement,
} from "@/lib/match/shaft-identity-supplement";
import { MATCH_SHAFTS_VERSION } from "@/lib/match/versions";

const ROOT = path.join(process.cwd(), "docs/teevo-match/driver-match-v1.1");
const REFERENCE = path.join(ROOT, "reference");

const ANSWERS = {
  handedness: "RIGHT" as const,
  handicap: 10,
  club_speed_mph: 95,
  typical_trajectory: "MID",
  typical_start_direction: "CENTRE",
  typical_curvature: "STRAIGHT",
  miss_severity: "MODERATE",
  strike_pattern: "CENTRE",
  strike_consistency: "MEDIUM",
  primary_objective: "DISTANCE",
  current_club_satisfaction: "UNKNOWN",
};

function recommendation(key: string): CatalogueHeadScore {
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

function listing(
  patch: Partial<TeevoDriverListingRow> & { id: string; shaft: string | null }
): TeevoDriverListingRow {
  return {
    user_id: "seller-1",
    brand: "PING",
    model: "G430 SFT",
    title: "PING G430 SFT",
    handed: "right",
    degree: "10.5",
    degree_numeric: 10.5,
    shaft_flex: "Stiff",
    condition: "Good",
    price: 19900,
    status: "verified",
    archived_at: null,
    buying_paused: false,
    availability_confirmation_status: null,
    ...patch,
  };
}

describe("shaft identity supplement", () => {
  const intel = loadMatchIntelligence(REFERENCE);
  const requirements = normalizeRequirements(ANSWERS, intel.headsByKey);
  const frozenShafts = intel.shafts.filter(
    (shaft) => shaft.intelligence_version !== "SHAFT_IDENTITY_SUPPLEMENT_V1"
  );

  it("loads six recognition-only identities without changing the frozen eligible set", () => {
    const supplement = loadShaftIdentitySupplement(REFERENCE, frozenShafts);
    expect(supplement.ok).toBe(true);
    expect(supplement.identities).toHaveLength(6);
    expect(
      supplement.identities.every(
        (row) =>
          row.match_eligibility === "RECOGNITION_ONLY" &&
          row.intelligence_version === "SHAFT_IDENTITY_SUPPLEMENT_V1" &&
          row.oem_brand === "TaylorMade"
      )
    ).toBe(true);
    expect(intel.matchEligibleShafts).toHaveLength(2394);
    expect(
      intel.matchEligibleShafts.some(
        (shaft) => shaft.intelligence_version === "SHAFT_IDENTITY_SUPPLEMENT_V1"
      )
    ).toBe(false);
    expect(MATCH_SHAFTS_VERSION).toBe("SHAFT_V1_2026-10-16");
  });

  it("leaves the frozen dataset hashes unchanged", () => {
    const manifest = JSON.parse(
      readFileSync(path.join(ROOT, "source-manifest.json"), "utf8")
    ) as { sources: Array<{ file: string; sha256: string }> };
    for (const source of manifest.sources) {
      const digest = createHash("sha256")
        .update(readFileSync(path.join(ROOT, source.file)))
        .digest("hex");
      expect(digest).toBe(source.sha256);
    }
  });

  it("rejects a bad version, a duplicate key, and a malformed row, and allows a shared alias", () => {
    const supplement = loadShaftIdentitySupplement(REFERENCE, frozenShafts);
    const sample = supplement.identities[0];
    expect(
      validateShaftIdentitySupplement(
        { supplement_version: "SHAFT_V1", identities: supplement.identities },
        frozenShafts
      ).reason
    ).toBe("SUPPLEMENT_VERSION_REJECTED");
    expect(
      validateShaftIdentitySupplement(
        {
          supplement_version: "SHAFT_IDENTITY_SUPPLEMENT_V1",
          identities: [{ ...sample, shaft_key: "fujikura|ventus-blue|2019|5|s" }],
        },
        frozenShafts
      ).reason
    ).toBe("DUPLICATE_CANONICAL_KEY");
    expect(
      validateShaftIdentitySupplement(
        {
          supplement_version: "SHAFT_IDENTITY_SUPPLEMENT_V1",
          identities: [{ ...sample, manufacturer: "" }],
        },
        frozenShafts
      ).reason
    ).toBe("MALFORMED_IDENTITY");
    const shared = validateShaftIdentitySupplement(
      {
        supplement_version: "SHAFT_IDENTITY_SUPPLEMENT_V1",
        identities: [
          sample,
          {
            ...sample,
            shaft_key: "fujikura|ventus-blue-taylormade-non-velocore|2021|5|s-copy",
          },
        ],
      },
      frozenShafts
    );
    expect(shared.ok).toBe(true);
    expect(shared.identities).toHaveLength(2);
  });

  it("keeps a protected seller description ambiguous when the supplement cannot be loaded", () => {
    const missing = loadShaftIdentitySupplement(
      mkdtempSync(path.join(tmpdir(), "teevo-shaft-")),
      frozenShafts
    );
    expect(missing.ok).toBe(false);
    expect(missing.reason).toBe("SUPPLEMENT_UNAVAILABLE");

    const empty = mkdtempSync(path.join(tmpdir(), "teevo-shaft-"));
    writeFileSync(path.join(empty, "shaft-identity-supplement.v1.json"), "{");
    expect(loadShaftIdentitySupplement(empty, frozenShafts).ok).toBe(false);

    const resolution = resolveShaftIdentity(
      { shaft: "VENTUS Blue 5S" },
      frozenShafts
    );
    expect(resolution).toEqual({
      resolved_key: null,
      eligible: false,
      reason: "AMBIGUOUS_IDENTITY",
    });
    expect(resolution.resolved_key).not.toBe("fujikura|ventus-blue|2019|5|s");
  });

  it("returns AMBIGUOUS_IDENTITY for shared Ventus Blue and Kuro Kage seller names", () => {
    const phrases = [
      "VENTUS Blue 5S",
      "Fujikura VENTUS Blue 5 S",
      "VENTUS Blue 5R",
      "Kuro Kage Silver 60 S",
      "Mitsubishi Kuro Kage Silver 60 R",
      "KuroKage Silver 60 X",
    ];
    for (const phrase of phrases) {
      const resolution = resolveShaftIdentity({ shaft: phrase }, intel.shafts);
      const matches = collectShaftIdentityMatches({ shaft: phrase }, intel.shafts);
      expect(resolution.reason).toBe("AMBIGUOUS_IDENTITY");
      expect(resolution.resolved_key).toBeNull();
      expect(resolution.eligible).toBe(false);
      expect(matches.some((match) => match.eligibility === "MATCH_ELIGIBLE")).toBe(
        true
      );
      expect(
        matches.some((match) => match.eligibility === "RECOGNITION_ONLY")
      ).toBe(true);
    }

    const spaced = resolveShaftIdentity({ shaft: "VENTUS Blue 5 S" }, intel.shafts);
    expect(spaced.reason).toBe("AMBIGUOUS_IDENTITY");
    expect(spaced.resolved_key).not.toBe("fujikura|ventus-blue|2019|5|s");
  });

  it("keeps generation-specific aftermarket aliases unique", () => {
    expect(resolveShaftIdentity({ shaft: "VENTUS Blue 6S" }, intel.shafts)).toEqual(
      {
        resolved_key: "fujikura|ventus-blue|2019|6|s",
        eligible: true,
        reason: null,
      }
    );
    expect(
      resolveShaftIdentity({ shaft: "Fujikura VENTUS Blue 6 S" }, intel.shafts)
        .resolved_key
    ).toBe("fujikura|ventus-blue|2019|6|s");
    expect(
      resolveShaftIdentity({ shaft: "VENTUS Blue VeloCore+ 6 S" }, intel.shafts)
        .resolved_key
    ).toBe("fujikura|ventus-blue-velocore-plus|2024|6|s");
    expect(
      resolveShaftIdentity({ shaft: "2024 VENTUS Blue 6 S" }, intel.shafts).eligible
    ).toBe(true);
    const kuro70 = resolveShaftIdentity(
      { shaft: "Kuro Kage Silver 70 S" },
      intel.shafts
    );
    expect(kuro70.eligible).toBe(true);
    expect(kuro70.resolved_key).toContain("|70|");
    expect(
      resolveShaftIdentity({ shaft: "Ventus Blue" }, intel.shafts).reason
    ).toBe("UNRESOLVED_IDENTITY");
  });

  it("does not treat a 1 g Kuro Kage gap as conclusive, and does not infer the shaft from the head", () => {
    const aftermarket = intel.shaftsByKey[
      "mitsubishi-chemical|kuro-kage-silver|2013|60|s"
    ];
    const overlapping = resolveShaftIdentity(
      {
        manufacturer: String(aftermarket.manufacturer),
        model: String(aftermarket.model),
        flex: String(aftermarket.flex),
        actual_weight_g: Number(aftermarket.actual_weight_g),
      },
      intel.shafts
    );
    expect(overlapping.reason).toBe("AMBIGUOUS_IDENTITY");

    const distinguished = resolveShaftIdentity(
      {
        manufacturer: String(aftermarket.manufacturer),
        model: String(aftermarket.model),
        flex: String(aftermarket.flex),
        actual_weight_g: Number(aftermarket.actual_weight_g),
        generation: "2013",
      },
      intel.shafts
    );
    expect(distinguished).toEqual({
      resolved_key: "mitsubishi-chemical|kuro-kage-silver|2013|60|s",
      eligible: true,
      reason: null,
    });

    const ventus = intel.shaftsByKey["fujikura|ventus-blue|2019|5|s"];
    expect(
      resolveShaftIdentity(
        {
          manufacturer: String(ventus.manufacturer),
          model: String(ventus.model),
          flex: String(ventus.flex),
          actual_weight_g: Number(ventus.actual_weight_g),
        },
        intel.shafts
      ).resolved_key
    ).toBe("fujikura|ventus-blue|2019|5|s");

    const ping = mapTeevoListingToInventoryItem(
      listing({ id: "ping-ventus", shaft: "VENTUS Blue 5S" }),
      intel
    );
    const taylormade = mapTeevoListingToInventoryItem(
      listing({
        id: "tm-ventus",
        brand: "TaylorMade",
        model: "Stealth",
        title: "TaylorMade Stealth 2021",
        shaft: "VENTUS Blue 5S",
      }),
      intel
    );
    expect(ping.shaft_key).toBeNull();
    expect(taylormade.shaft_key).toBeNull();
    expect(ping.identity.shaft_resolution).toBe("AMBIGUOUS");
    expect(taylormade.identity.shaft_resolution).toBe("AMBIGUOUS");
  });

  it("does not score a recognition-only identity or award a complete-club badge", () => {
    const oem = intel.shaftsByKey[
      "fujikura|ventus-blue-taylormade-non-velocore|2021|5|s"
    ];
    const scored = scoreCandidate({
      listing: {
        listing_id: "oem-ventus",
        head_key: "ping|g430-sft|2023",
        shaft_key: String(oem.shaft_key),
        handedness: "RIGHT",
        stated_loft_deg: 10.5,
        publicly_purchasable: true,
        price_gbp: 199,
      },
      requirements,
      head: intel.headsByKey["ping|g430-sft|2023"],
      shaft: oem,
      golferConfidence: 80,
    });
    expect(scored.excluded).toBe(true);
    expect(scored.exclusion_reasons).toContain("SHAFT_NOT_MATCH_ELIGIBLE");

    const mapped = mapTeevoListingToInventoryItem(
      listing({ id: "ambiguous-listing", shaft: "VENTUS Blue 5S" }),
      intel
    );
    expect(mapped.availability_status).toBe("AVAILABLE");
    expect(mapped.head_key).toBe("ping|g430-sft|2023");
    expect(mapped.shaft_key).toBeNull();
    expect(mapped.identity.shaft_resolution).toBe("AMBIGUOUS");
    expect(mapped.identity.evidence.join(" ")).toContain(
      "shaft_res:AMBIGUOUS_IDENTITY"
    );
    expect(mapped.identity.evidence.join(" ")).toContain(
      "fujikura|ventus-blue|2019|5|s"
    );
    expect(mapped.identity.evidence.join(" ")).toContain(
      "fujikura|ventus-blue-taylormade-non-velocore|2021|5|s"
    );
    expect(mapped.listed_config.shaft_label).toBe("VENTUS Blue 5S");
    expect(mapped.identity.evidence.join(" ")).not.toContain("manufacturer:");

    const [attachment] = attachInventoryToCatalogueRecommendations({
      recommendations: [recommendation("ping|g430-sft|2023")],
      inventory: [mapped],
      requirements,
      intelligence: intel,
      golferConfidence: 80,
    });
    expect(attachment.items).toHaveLength(1);
    expect(attachment.items[0].attach_mode).toBe("HEAD_ONLY");
    expect(attachment.items[0].listing_match).toBeNull();
    expect(attachment.items[0].unverified_shaft).toBe(true);

    const recognised = mapTeevoListingToInventoryItem(
      listing({ id: "oem-only", shaft: "Kuro Kage 5th Gen Silver 60 S" }),
      intel
    );
    expect(recognised.shaft_key).toBeNull();
    expect(recognised.identity.evidence.join(" ")).toContain(
      "shaft_identity_blocked:mitsubishi-chemical|kuro-kage-silver-5th-gen|2021|60|s"
    );
  });

  it("still fail-closes the listing adapter when recognition rows are absent", () => {
    const frozenOnly = {
      ...intel,
      shafts: frozenShafts,
    };
    const mapped = mapTeevoListingToInventoryItem(
      listing({ id: "no-supplement", shaft: "Kuro Kage Silver 60 S" }),
      frozenOnly
    );
    expect(mapped.shaft_key).toBeNull();
    expect(mapped.identity.shaft_resolution).toBe("AMBIGUOUS");
    expect(mapped.identity.evidence).toContain(
      "shaft_fail_closed:protected_phrase"
    );
    expect(mapped.shaft_key).not.toBe(
      "mitsubishi-chemical|kuro-kage-silver|2013|60|s"
    );
  });
});
