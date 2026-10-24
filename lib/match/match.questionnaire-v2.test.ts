import { describe, expect, it } from "vitest";
import { buildShaftGuidance } from "@/lib/match/app/shaft-guidance";
import {
  answersToApiPayload,
  EMPTY_MATCH_ANSWERS,
} from "@/lib/match/app/session-storage";
import {
  commitStep2Measurement,
  EMPTY_STEP2_DRAFT,
} from "@/lib/match/app/step2-measurement";
import { validateMatchQuestionnaireInputs } from "@/lib/match/app/validate-inputs";
import {
  golferEvidenceConfidence,
  normalizeRequirements,
} from "@/lib/match/requirements";

const BASE = {
  handedness: "RIGHT",
  handicap: 14,
  typical_trajectory: "MID",
  typical_start_direction: "CENTRE",
  typical_curvature: "STRAIGHT",
  miss_severity: "UNKNOWN",
  strike_pattern: "CENTRE",
  strike_consistency: "LOW",
  primary_objective: "DISTANCE",
};

describe("questionnaire v2 evidence", () => {
  it("does not add the varies modifier when strike consistency is known", () => {
    const known = normalizeRequirements(
      { ...BASE, strike_pattern: "VARIABLE", strike_consistency: "LOW" },
      {}
    );
    const locationOnly = normalizeRequirements(
      { ...BASE, strike_pattern: "HEEL", strike_consistency: "LOW" },
      {}
    );
    const unknownConsistency = normalizeRequirements(
      {
        ...BASE,
        strike_pattern: "VARIABLE",
        strike_consistency: "UNKNOWN",
      },
      {}
    );
    const centreUnknown = normalizeRequirements(
      {
        ...BASE,
        strike_pattern: "CENTRE",
        strike_consistency: "UNKNOWN",
      },
      {}
    );

    expect(known.forgiveness_requirement).toBe(locationOnly.forgiveness_requirement);
    expect(known.stability_requirement).toBe(locationOnly.stability_requirement);
    expect(unknownConsistency.forgiveness_requirement).toBe(
      (centreUnknown.forgiveness_requirement ?? 0) + 0.5
    );
    expect(known.requirement_confidence.forgiveness.source_codes).not.toContain(
      "STRIKE_PATTERN"
    );
    expect(unknownConsistency.requirement_confidence.forgiveness.source_codes).toContain(
      "STRIKE_PATTERN"
    );
  });

  it("records heel, toe, high and low without a scoring change", () => {
    const centre = normalizeRequirements({ ...BASE, strike_pattern: "CENTRE" }, {});
    for (const pattern of ["HEEL", "TOE", "HIGH_FACE", "LOW_FACE"]) {
      const located = normalizeRequirements({ ...BASE, strike_pattern: pattern }, {});
      expect(located.forgiveness_requirement).toBe(centre.forgiveness_requirement);
      expect(located.stability_requirement).toBe(centre.stability_requirement);
      expect(located.workability_preference).toBe(centre.workability_preference);
    }
  });

  it("keeps a legacy speed number measured and labels an estimate separately", () => {
    const legacy = validateMatchQuestionnaireInputs({
      ...BASE,
      club_speed_mph: 95,
    });
    const estimated = validateMatchQuestionnaireInputs({
      ...BASE,
      club_speed_mph: 95,
      speed_evidence: { method: "estimated_mph", band: null },
    });
    const measured = validateMatchQuestionnaireInputs({
      ...BASE,
      club_speed_mph: 95,
      speed_evidence: { method: "measured_mph", band: null },
    });
    expect(legacy.ok && estimated.ok && measured.ok).toBe(true);
    if (!legacy.ok || !estimated.ok || !measured.ok) return;

    const legacyReq = normalizeRequirements(legacy.raw, {});
    const estimatedReq = normalizeRequirements(estimated.raw, {});
    const measuredReq = normalizeRequirements(measured.raw, {});

    expect(legacyReq.shaft_flex_min_value).toBe(2);
    expect(legacyReq.shaft_flex_max_value).toBe(3);
    expect(estimatedReq.shaft_flex_min_value).toBe(measuredReq.shaft_flex_min_value);
    expect(estimatedReq.shaft_weight_min_g).toBe(measuredReq.shaft_weight_min_g);
    expect(estimatedReq.requirement_confidence.flex.source_codes).toContain(
      "ESTIMATED_SPEED"
    );
    expect(estimatedReq.requirement_confidence.flex.source_codes).not.toContain(
      "MEASURED_SPEED"
    );
    expect(measuredReq.requirement_confidence.flex.source_codes).toContain(
      "MEASURED_SPEED"
    );
    expect(legacyReq.requirement_confidence.flex.source_codes).toContain(
      "MEASURED_SPEED"
    );
  });

  it("keeps carry as carry and maps approximate bands onto existing windows", () => {
    const carry = validateMatchQuestionnaireInputs({
      ...BASE,
      carry_distance_yards: 220,
      speed_evidence: { method: "carry_yards", band: null },
    });
    const slow = validateMatchQuestionnaireInputs({
      ...BASE,
      speed_evidence: { method: "band", band: "SLOW" },
    });
    const fast = validateMatchQuestionnaireInputs({
      ...BASE,
      speed_evidence: { method: "band", band: "FAST" },
    });
    expect(carry.ok && slow.ok && fast.ok).toBe(true);
    if (!carry.ok || !slow.ok || !fast.ok) return;

    const carryReq = normalizeRequirements(carry.raw, {});
    const slowReq = normalizeRequirements(slow.raw, {});
    const fastReq = normalizeRequirements(fast.raw, {});

    expect(carryReq.shaft_flex_min_value).toBe(2);
    expect(carryReq.shaft_flex_max_value).toBe(3);
    expect(carryReq.shaft_weight_min_g).toBeNull();
    expect(carry.raw.club_speed_mph).toBeNull();

    expect(slowReq.shaft_flex_min_value).toBe(0);
    expect(slowReq.shaft_flex_max_value).toBe(2.5);
    expect(slowReq.shaft_weight_min_g).toBe(40);
    expect(slowReq.shaft_weight_max_g).toBe(60);
    expect(slow.raw.club_speed_mph).toBeNull();
    expect(slowReq.requirement_confidence.flex.source_codes).toContain(
      "APPROXIMATE_SPEED"
    );

    expect(fastReq.shaft_flex_min_value).toBe(2.5);
    expect(fastReq.shaft_flex_max_value).toBe(5);
    expect(fastReq.shaft_weight_min_g).toBe(55);
    expect(fastReq.shaft_weight_max_g).toBe(75);

    const slowGuidance = buildShaftGuidance(slowReq);
    expect(slowGuidance.flex_label).toMatch(/range, not one shaft flex/i);
    expect(slowGuidance.flex_label).not.toMatch(/SKU|Ventus|Hzrdus/i);

    expect(golferEvidenceConfidence(slow.raw, slowReq.conflict_flags)).toBeGreaterThan(
      golferEvidenceConfidence({ ...BASE }, [])
    );
  });

  it("commits estimated speed without calling it measured", () => {
    const committed = commitStep2Measurement(
      { ...EMPTY_MATCH_ANSWERS, handedness: "RIGHT" },
      { ...EMPTY_STEP2_DRAFT, knowledge: "ESTIMATED", speedDraft: "95" }
    );
    const payload = answersToApiPayload(committed);
    expect(payload.club_speed_mph).toBe(95);
    expect(payload.speed_evidence).toEqual({ method: "estimated_mph", band: null });
  });
});
