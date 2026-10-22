import { describe, expect, it } from "vitest";
import {
  PATHWAY_C_SPEED_REPLACES_CARRY,
  pathwayCReplacesCarry,
  presentCharacteristicGuidance,
} from "@/lib/match/app/present-guidance";
import type {
  CharacteristicGuidance,
  ShaftGuidance,
} from "@/lib/match/catalogue-types";

function guidance(patch: Partial<CharacteristicGuidance> = {}): CharacteristicGuidance {
  return {
    handedness: "RIGHT",
    preferred_loft_min_deg: 10,
    preferred_loft_max_deg: 12,
    shaft_flex_min_value: 0,
    shaft_flex_max_value: 2,
    shaft_weight_min_g: 40,
    shaft_weight_max_g: 55,
    shaft_launch_target: "MID",
    head_launch_target: "UNRESOLVED",
    directional_requirement: "UNRESOLVED",
    forgiveness_requirement: null,
    stability_requirement: null,
    workability_preference: null,
    notes: ["Named head rankings need enough independent head-fit evidence."],
    ...patch,
  };
}

function shaft(patch: Partial<ShaftGuidance> = {}): ShaftGuidance {
  return {
    available: false,
    flex_label: null,
    weight_label: null,
    launch_label: null,
    notes: ["Shaft advice here describes target characteristics, not a fitted shaft."],
    ...patch,
  };
}

function face(card: ReturnType<typeof presentCharacteristicGuidance>): string {
  return [card.title, card.reason, ...card.characteristics, card.limitation].join(" ");
}

describe("characteristic guidance presentation", () => {
  it("explains similar drivers without naming a head or blaming the golfer", () => {
    const card = presentCharacteristicGuidance({
      mode: "CHARACTERISTIC_GUIDANCE",
      insufficientEvidenceReason: "NO_MEANINGFUL_HEAD_DIFFERENTIATION",
      guidance: guidance({
        forgiveness_requirement: 4.5,
        head_launch_target: "MID",
      }),
      shaft: shaft(),
    });
    expect(card.title).toBe("Let's narrow down your driver");
    expect(card.reason).toMatch(/similarly suitable/i);
    expect(card.reason).not.toMatch(/wrong|incorrect|mistake in what you/i);
    expect(card.characteristics).toContain("More forgiving on off-centre strikes.");
    expect(card.characteristics).toContain(
      "A head with characteristics suited to the ball flight you described."
    );
    expect(face(card)).not.toMatch(/\d+°/);
    expect(card.details.join(" ")).toMatch(/10°–12°/);
  });

  it("does not invent flight or forgiveness when those answers are unresolved", () => {
    const card = presentCharacteristicGuidance({
      mode: "CHARACTERISTIC_GUIDANCE",
      insufficientEvidenceReason: "INSUFFICIENT_EVIDENCE_BACKED_REQUIREMENT_DIMS",
      guidance: guidance({
        head_launch_target: "UNRESOLVED",
        directional_requirement: "NEUTRAL",
        forgiveness_requirement: 3,
      }),
      shaft: shaft(),
    });
    expect(card.reason).toMatch(/a little more about your game/i);
    expect(card.characteristics).toEqual([]);
    expect(face(card)).not.toMatch(/ball flight|off-centre|shot shape/i);
  });

  it("states a balance only when forgiveness and shot shaping are both supported", () => {
    const card = presentCharacteristicGuidance({
      mode: "CHARACTERISTIC_GUIDANCE",
      insufficientEvidenceReason: "NO_MEANINGFUL_HEAD_DIFFERENTIATION",
      guidance: guidance({
        forgiveness_requirement: 3.5,
        workability_preference: 3.2,
        directional_requirement: "DRAW_ASSIST",
      }),
      shaft: shaft(),
    });
    expect(card.characteristics).toContain(
      "A suitable balance between forgiveness and shot shaping."
    );
    expect(card.characteristics).toContain(
      "A head with characteristics suited to the shot shape you described."
    );
    expect(card.characteristics).not.toContain("More forgiving on off-centre strikes.");
  });

  it("keeps a no-head result from sounding like a named recommendation", () => {
    const card = presentCharacteristicGuidance({
      mode: "NO_DEFENSIBLE_HEADS",
      insufficientEvidenceReason: null,
      guidance: guidance(),
      shaft: shaft(),
    });
    expect(card.reason).toMatch(/could not find a driver/i);
    expect(face(card)).not.toMatch(/best match|excellent match/i);
  });

  it("warns about replacing carry only when a swing speed is being entered", () => {
    expect(pathwayCReplacesCarry("220", "95")).toBe(true);
    expect(pathwayCReplacesCarry("220", "")).toBe(false);
    expect(pathwayCReplacesCarry("", "95")).toBe(false);
    expect(PATHWAY_C_SPEED_REPLACES_CARRY).toMatch(/measured swing speed/i);
    expect(PATHWAY_C_SPEED_REPLACES_CARRY).toMatch(/carry distance/i);
  });
});
