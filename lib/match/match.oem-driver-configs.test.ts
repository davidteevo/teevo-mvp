import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { join } from "path";
import {
  loadMatchIntelligence,
  loadOemDriverConfigs,
  loadOemDriverConfigsOrNull,
  namedOemOfferingsForHead,
  MATCH_OEM_DRIVER_CONFIGS_VERSION,
  validateOemDriverConfigs,
  runCatalogueRecommendation,
} from "@/lib/match";
import type { OemDriverConfigsFile } from "@/lib/match/oem-driver-configs";

const REFERENCE = path.join(
  process.cwd(),
  "docs/teevo-match/driver-match-v1.1/reference"
);

const FROZEN_HASHES = {
  heads: "1e4c0711732515e6df74a4d586eaa95da1cbf0f4",
  shafts: "d77c369f734d212236acdff88b86ddcf0a3af1d4",
} as const;

async function sha1(filePath: string): Promise<string> {
  const { createHash } = await import("crypto");
  return createHash("sha1")
    .update(readFileSync(filePath))
    .digest("hex");
}

function baseOverlay(): OemDriverConfigsFile {
  return JSON.parse(
    readFileSync(join(REFERENCE, "oem-driver-configs.v1.json"), "utf8")
  ) as OemDriverConfigsFile;
}

function writeTempOverlay(overlay: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), "oem-driver-configs-"));
  writeFileSync(join(dir, "oem-driver-configs.v1.json"), JSON.stringify(overlay));
  return dir;
}

describe("OEM driver configs Checkpoint B", () => {
  const intelligence = loadMatchIntelligence(REFERENCE);

  it("loads the pilot overlay with verified PING named offerings", () => {
    const index = loadOemDriverConfigs(REFERENCE, intelligence);
    expect(index.version).toBe(MATCH_OEM_DRIVER_CONFIGS_VERSION);

    const pingNamed = namedOemOfferingsForHead(index, "ping|g430-max|2023");
    expect(pingNamed).toHaveLength(8);
    expect(
      pingNamed.every(
        (o) =>
          o.named_option_eligible &&
          o.shaft_identity_status === "RESOLVED_MATCH_ELIGIBLE" &&
          o.offering_verification_status === "VERIFIED_OFFERING"
      )
    ).toBe(true);

    expect(namedOemOfferingsForHead(index, "taylormade|sim-max|2020")).toEqual(
      []
    );
    expect(namedOemOfferingsForHead(index, "callaway|rogue-st-max|2022")).toEqual(
      []
    );
    expect(namedOemOfferingsForHead(index, "cobra|aerojet|2023")).toEqual([]);
    expect(
      namedOemOfferingsForHead(index, "wilson|dynapwr-titanium|2023")
    ).toEqual([]);
  });

  it("rejects an unknown driver-head key", () => {
    const overlay = baseOverlay();
    overlay.members[0] = {
      ...overlay.members[0],
      catalogue_key: "not-a-real|head|1999",
    };
    expect(() => validateOemDriverConfigs(overlay, intelligence)).toThrow(
      /unknown catalogue_key/
    );
  });

  it("rejects an unknown shaft key", () => {
    const overlay = baseOverlay();
    const offering = overlay.members[0].offerings.find(
      (o) => o.named_option_eligible
    )!;
    offering.shaft_key = "ping|not-a-shaft|2099|55|regular";
    expect(() => validateOemDriverConfigs(overlay, intelligence)).toThrow(
      /unknown shaft_key/
    );
  });

  it("rejects naming a recognition-only shaft", () => {
    const overlay = baseOverlay();
    const sim = overlay.members.find(
      (m) => m.catalogue_key === "taylormade|sim-max|2020"
    )!;
    const recognition = sim.offerings.find(
      (o) => o.shaft_identity_status === "RECOGNITION_ONLY"
    )!;
    recognition.named_option_eligible = true;
    recognition.offering_verification_status = "VERIFIED_OFFERING";
    recognition.market_scope = "UK_EU";
    expect(() => validateOemDriverConfigs(overlay, intelligence)).toThrow(
      /recognition-only shaft cannot be named|named_option_eligible/
    );
  });

  it("rejects wrong-generation AFTERMARKET promotion as RESOLVED_MATCH_ELIGIBLE", () => {
    const overlay = baseOverlay();
    const sim = overlay.members.find(
      (m) => m.catalogue_key === "taylormade|sim-max|2020"
    )!;
    const blocked = sim.offerings.find(
      (o) => o.offering_id === "tm-sim-max-2020-ventus-blue-6-unresolved"
    )!;
    blocked.shaft_identity_status = "RESOLVED_MATCH_ELIGIBLE";
    blocked.shaft_key = "fujikura|ventus-blue|2019|6|s";
    blocked.named_option_eligible = true;
    expect(() => validateOemDriverConfigs(overlay, intelligence)).toThrow(
      /AFTERMARKET|named_option_eligible|RESOLVED_MATCH_ELIGIBLE/
    );
  });

  it("keeps OEM/aftermarket collision offerings unnamed", () => {
    const index = loadOemDriverConfigs(REFERENCE, intelligence);
    const ping = index.byCatalogueKey.get("ping|g430-max|2023")!;
    const blocked = ping.offerings.filter(
      (o) => o.shaft_identity_status === "AFTERMARKET_COLLISION_BLOCKED"
    );
    expect(blocked.length).toBeGreaterThanOrEqual(2);
    expect(blocked.every((o) => !o.named_option_eligible && o.shaft_key === null)).toBe(
      true
    );
  });

  it("rejects missing source evidence on VERIFIED_OFFERING", () => {
    const overlay = baseOverlay();
    const offering = overlay.members[0].offerings.find(
      (o) => o.named_option_eligible
    )!;
    offering.source_url = "";
    expect(() => validateOemDriverConfigs(overlay, intelligence)).toThrow(
      /source_url/
    );
  });

  it("rejects UNKNOWN market_scope on VERIFIED_OFFERING", () => {
    const overlay = baseOverlay();
    const offering = overlay.members[0].offerings.find(
      (o) => o.named_option_eligible
    )!;
    offering.market_scope = "UNKNOWN";
    expect(() => validateOemDriverConfigs(overlay, intelligence)).toThrow(
      /UNKNOWN market_scope/
    );
  });

  it("rejects VERIFIED_COMPLETE_CONFIGURATION without loft and handedness", () => {
    const overlay = baseOverlay();
    const offering = overlay.members[0].offerings.find(
      (o) => o.named_option_eligible
    )!;
    offering.configuration_completeness = "VERIFIED_COMPLETE_CONFIGURATION";
    offering.loft_options_deg = null;
    offering.handedness_scope = "UNKNOWN";
    expect(() => validateOemDriverConfigs(overlay, intelligence)).toThrow(
      /VERIFIED_COMPLETE_CONFIGURATION/
    );
  });

  it("does not invent handedness claims for PING named offerings", () => {
    const index = loadOemDriverConfigs(REFERENCE, intelligence);
    const named = namedOemOfferingsForHead(index, "ping|g430-max|2023");
    expect(named.every((o) => o.handedness_scope === "UNKNOWN")).toBe(true);
    expect(named.every((o) => o.loft_options_deg === null)).toBe(true);
    expect(
      named.every((o) => o.configuration_completeness === "OFFERING_ONLY")
    ).toBe(true);
  });

  it("rejects duplicate offering ids", () => {
    const overlay = baseOverlay();
    overlay.members[0].offerings.push({
      ...overlay.members[0].offerings[0],
    });
    expect(() => validateOemDriverConfigs(overlay, intelligence)).toThrow(
      /duplicate offering_id/
    );
  });

  it("rejects incorrect dataset version", () => {
    const overlay = baseOverlay();
    overlay.overlay_version = "MATCH_OEM_DRIVER_CONFIGS_V0" as never;
    expect(() => validateOemDriverConfigs(overlay, intelligence)).toThrow(
      /Unsupported oem-driver-configs overlay version/
    );
  });

  it("rejects an invalid overlay file when present", () => {
    const dir = writeTempOverlay({ overlay_version: "nope", members: [] });
    expect(() => loadOemDriverConfigs(dir, intelligence)).toThrow();
  });

  it("returns null for a missing overlay without disabling head recommendations", () => {
    const emptyDir = mkdtempSync(join(tmpdir(), "oem-missing-"));
    expect(existsSync(join(emptyDir, "oem-driver-configs.v1.json"))).toBe(false);
    expect(loadOemDriverConfigsOrNull(emptyDir, intelligence)).toBeNull();
    expect(namedOemOfferingsForHead(null, "ping|g430-max|2023")).toEqual([]);

    const result = runCatalogueRecommendation({
      answers: {
        handedness: "RIGHT",
        handicap: 18,
        club_speed_mph: 85,
        typical_trajectory: "MID",
        typical_start_direction: "RIGHT",
        typical_curvature: "RIGHT",
        miss_severity: "MODERATE",
        strike_pattern: "CENTRE",
        strike_consistency: "MEDIUM",
        primary_objective: "FORGIVENESS",
        current_club_satisfaction: "MEDIUM",
      },
      intelligence,
    });
    expect(
      result.recommendations.length + (result.example_heads?.length ?? 0)
    ).toBeGreaterThan(0);
  });

  it("does not alter frozen dataset hashes", async () => {
    expect(await sha1(join(REFERENCE, "heads.json"))).toBe(FROZEN_HASHES.heads);
    expect(await sha1(join(REFERENCE, "shafts.json"))).toBe(FROZEN_HASHES.shafts);
  });
});
