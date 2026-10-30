import { describe, expect, it } from "vitest";
import path from "path";
import {
  loadMatchIntelligence,
  loadOemDriverConfigs,
  normalizeRequirements,
  golferEvidenceConfidence,
  scoreCatalogueHead,
  selectOemShaftOptionsForHeads,
  presentShaftOptionsSection,
  OEM_SHAFT_OFFERING_NOTE,
} from "@/lib/match";
import type { OemShaftOptionAssessment } from "@/lib/match/app/select-oem-shaft-options";

const REFERENCE = path.join(
  process.cwd(),
  "docs/teevo-match/driver-match-v1.1/reference"
);
const intel = loadMatchIntelligence(REFERENCE);
const oem = loadOemDriverConfigs(REFERENCE, intel);
const G430 = "ping|g430-max|2023";

function answers(patch: Record<string, unknown> = {}) {
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
    speed_evidence: { method: "measured_mph", band: null },
    ...patch,
  };
}

function namedOptions(raw: Record<string, unknown>): {
  options: OemShaftOptionAssessment[];
  requirements: ReturnType<typeof normalizeRequirements>;
} {
  const requirements = normalizeRequirements(raw, intel.headsByKey);
  const golfer = golferEvidenceConfidence(raw, requirements.conflict_flags);
  const head = scoreCatalogueHead({
    head: intel.headsByKey[G430]!,
    requirements,
    golferConfidence: golfer,
  });
  const selected = selectOemShaftOptionsForHeads({
    heads: [head],
    requirements,
    intelligence: intel,
    oemConfigs: oem,
    golferConfidence: golfer,
    oemOverlayStatus: "LOADED",
  });
  return { options: [...selected.by_head[0].options], requirements };
}

describe("presentShaftOptionsSection", () => {
  it("presents two named PING options with offering note and weight from actual_weight_g", () => {
    const { options, requirements } = namedOptions(answers());
    expect(options.length).toBe(2);
    const presented = presentShaftOptionsSection({
      options,
      requirements,
      pageHasSharedShaftGuidance: true,
    });
    expect(presented.mode).toBe("named");
    expect(presented.heading).toBe("Shafts worth considering");
    expect(presented.offeringNote).toBe(OEM_SHAFT_OFFERING_NOTE);
    expect(presented.primary?.title.length).toBeGreaterThan(0);
    expect(presented.primary?.weightLabel).toMatch(/About \d+ g recorded weight/);
    expect(presented.alternatives).toHaveLength(1);
    expect(presented.differenceNote).toBeTruthy();
    expect(presented.suggestedLoftLabel).toMatch(/Suggested loft territory/);
    expect(presented.offeringNote).not.toMatch(/VERIFIED_COMPLETE/i);
  });

  it("presents a single option without manufacturing a second", () => {
    const { options, requirements } = namedOptions(answers());
    const presented = presentShaftOptionsSection({
      options: options.slice(0, 1),
      requirements,
      pageHasSharedShaftGuidance: true,
    });
    expect(presented.alternatives).toEqual([]);
    expect(presented.differenceNote).toBeNull();
  });

  it("omits card-level generic guidance when the page already shows shared guidance", () => {
    const requirements = normalizeRequirements(answers(), intel.headsByKey);
    const presented = presentShaftOptionsSection({
      options: [],
      requirements,
      pageHasSharedShaftGuidance: true,
    });
    expect(presented.mode).toBe("none");
    expect(presented.primary).toBeNull();
  });

  it("uses recorded weight, not the commercial 65 weight-class label as grams", () => {
    const { options, requirements } = namedOptions(
      answers({
        club_speed_mph: 78,
        typical_trajectory: "HIGH",
        primary_objective: "HIGHER_FLIGHT",
      })
    );
    const chrome = options.find((o) => o.shaft_key.includes("tour-2-0-chrome"));
    expect(chrome).toBeTruthy();
    const presented = presentShaftOptionsSection({
      options: chrome ? [chrome] : options.slice(0, 1),
      requirements,
      pageHasSharedShaftGuidance: true,
    });
    expect(presented.primary?.weightLabel).toMatch(/About 56 g/);
    expect(presented.primary?.weightLabel).not.toMatch(/About 65 g/);
  });

  it("keeps configuration claim language out of consumer presentation", () => {
    const { options, requirements } = namedOptions(answers());
    const presented = presentShaftOptionsSection({
      options,
      requirements,
      pageHasSharedShaftGuidance: true,
    });
    const blob = JSON.stringify(presented);
    expect(blob).not.toMatch(/VERIFIED_COMPLETE_CONFIGURATION/);
    expect(blob).not.toMatch(/MATCH_ELIGIBLE/);
    expect(blob).not.toMatch(/Perfect shaft/i);
  });
});
