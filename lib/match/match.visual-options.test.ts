import { describe, expect, it } from "vitest";
import {
  answersToApiPayload,
  EMPTY_MATCH_ANSWERS,
  type MatchQuestionnaireAnswers,
} from "@/lib/match/app/session-storage";
import {
  CURVATURE_ENUMS,
  CURVATURE_LABELS,
  CURVATURE_VARIABLE_CLARIFY_ORDER,
  curvatureEnumForLabel,
  isCurvatureEnum,
  isStartDirectionEnum,
  isStrikePatternEnum,
  isTrajectoryEnum,
  START_DIRECTION_ENUMS,
  START_DIRECTION_LABELS,
  startDirectionEnumForLabel,
  STRIKE_IMPACT_RH,
  STRIKE_PATTERN_ENUMS,
  STRIKE_PATTERN_LABELS,
  strikeImpactScreenX,
  strikePatternEnumForLabel,
  TRAJECTORY_ENUMS,
  TRAJECTORY_LABELS,
  trajectoryEnumForLabel,
} from "@/lib/match/app/visual-option-maps";
import { validateMatchQuestionnaireInputs } from "@/lib/match/app/validate-inputs";
import { normalizeRequirements } from "@/lib/match/requirements";

function baseAnswers(
  patch: Partial<MatchQuestionnaireAnswers>
): MatchQuestionnaireAnswers {
  return {
    ...EMPTY_MATCH_ANSWERS,
    handedness: "RIGHT",
    ...patch,
  };
}

function validatedRaw(answers: MatchQuestionnaireAnswers) {
  const payload = answersToApiPayload(answers);
  const validated = validateMatchQuestionnaireInputs(payload);
  expect(validated.ok).toBe(true);
  if (!validated.ok) throw new Error("validation failed");
  return { payload, raw: validated.raw };
}

describe("B1a trajectory visual option maps", () => {
  it("exposes exactly LOW MID HIGH UNKNOWN", () => {
    expect([...TRAJECTORY_ENUMS]).toEqual(["LOW", "MID", "HIGH", "UNKNOWN"]);
  });

  it("maps visible labels to engine enums", () => {
    expect(trajectoryEnumForLabel("Low")).toBe("LOW");
    expect(trajectoryEnumForLabel("Mid")).toBe("MID");
    expect(trajectoryEnumForLabel("High")).toBe("HIGH");
    expect(trajectoryEnumForLabel("Not sure")).toBe("UNKNOWN");
    expect(trajectoryEnumForLabel("Desired high")).toBeNull();
  });

  it("rejects unsupported trajectory strings", () => {
    expect(isTrajectoryEnum("LOW")).toBe(true);
    expect(isTrajectoryEnum("DESIRED_HIGH")).toBe(false);
    expect(isTrajectoryEnum("")).toBe(false);
  });

  it("keeps questionnaire payload identical for each trajectory enum", () => {
    for (const traj of TRAJECTORY_ENUMS) {
      const { payload, raw } = validatedRaw(
        baseAnswers({ typical_trajectory: traj })
      );
      expect(payload.typical_trajectory).toBe(traj);
      expect(raw.typical_trajectory).toBe(traj);
    }
  });

  it("preserves prior RadioCards label contract", () => {
    expect(TRAJECTORY_LABELS).toEqual({
      LOW: "Low",
      MID: "Mid",
      HIGH: "High",
      UNKNOWN: "Not sure",
    });
  });
});

describe("B1b start direction + curvature visual option maps", () => {
  it("exposes exact start-direction enums", () => {
    expect([...START_DIRECTION_ENUMS]).toEqual([
      "LEFT",
      "CENTRE",
      "RIGHT",
      "VARIABLE",
      "UNKNOWN",
    ]);
  });

  it("exposes exact curvature enums", () => {
    expect([...CURVATURE_ENUMS]).toEqual([
      "LEFT",
      "STRAIGHT",
      "RIGHT",
      "VARIABLE",
      "UNKNOWN",
    ]);
  });

  it("maps questionnaire labels to enums", () => {
    expect(startDirectionEnumForLabel("Left")).toBe("LEFT");
    expect(startDirectionEnumForLabel("Centre")).toBe("CENTRE");
    expect(startDirectionEnumForLabel("Right")).toBe("RIGHT");
    expect(startDirectionEnumForLabel("Varies")).toBe("VARIABLE");
    expect(startDirectionEnumForLabel("Not sure")).toBe("UNKNOWN");
    expect(curvatureEnumForLabel("Curves left")).toBe("LEFT");
    expect(curvatureEnumForLabel("Mostly straight")).toBe("STRAIGHT");
    expect(curvatureEnumForLabel("Curves right")).toBe("RIGHT");
    expect(curvatureEnumForLabel("Varies")).toBe("VARIABLE");
    expect(curvatureEnumForLabel("Not sure")).toBe("UNKNOWN");
  });

  it("preserves prior RadioCards label contracts", () => {
    expect(START_DIRECTION_LABELS).toEqual({
      LEFT: "Left",
      CENTRE: "Centre",
      RIGHT: "Right",
      VARIABLE: "Varies",
      UNKNOWN: "Not sure",
    });
    expect(CURVATURE_LABELS).toEqual({
      LEFT: "Curves left",
      STRAIGHT: "Mostly straight",
      RIGHT: "Curves right",
      VARIABLE: "Varies",
      UNKNOWN: "Not sure",
    });
  });

  it("keeps variable-clarify option order", () => {
    expect([...CURVATURE_VARIABLE_CLARIFY_ORDER]).toEqual([
      "VARIABLE",
      "LEFT",
      "RIGHT",
      "STRAIGHT",
      "UNKNOWN",
    ]);
  });

  it("rejects unsupported start/curve strings", () => {
    expect(isStartDirectionEnum("CENTRE")).toBe(true);
    expect(isStartDirectionEnum("CENTER")).toBe(false);
    expect(isCurvatureEnum("STRAIGHT")).toBe(true);
    expect(isCurvatureEnum("DRAW")).toBe(false);
  });

  it("payload + validation for every start and curve option", () => {
    for (const start of START_DIRECTION_ENUMS) {
      const { payload, raw } = validatedRaw(
        baseAnswers({ typical_start_direction: start })
      );
      expect(payload.typical_start_direction).toBe(start);
      expect(raw.typical_start_direction).toBe(start);
    }
    for (const curve of CURVATURE_ENUMS) {
      const { payload, raw } = validatedRaw(
        baseAnswers({ typical_curvature: curve })
      );
      expect(payload.typical_curvature).toBe(curve);
      expect(raw.typical_curvature).toBe(curve);
    }
  });

  it("combined start+curve answers keep independent fields and normalize stably", () => {
    const cases: Array<{
      id: string;
      start: string;
      curve: string;
    }> = [
      { id: "starts right + curves left", start: "RIGHT", curve: "LEFT" },
      { id: "starts left + curves right", start: "LEFT", curve: "RIGHT" },
      { id: "starts centre + curves right", start: "CENTRE", curve: "RIGHT" },
      {
        id: "starts centre + flies straight",
        start: "CENTRE",
        curve: "STRAIGHT",
      },
      { id: "genuine VARIABLE curve", start: "CENTRE", curve: "VARIABLE" },
      { id: "UNKNOWN inputs", start: "UNKNOWN", curve: "UNKNOWN" },
    ];

    for (const c of cases) {
      const answers = baseAnswers({
        typical_start_direction: c.start,
        typical_curvature: c.curve,
        typical_trajectory: "MID",
      });
      const { payload, raw } = validatedRaw(answers);
      expect(payload.typical_start_direction, c.id).toBe(c.start);
      expect(payload.typical_curvature, c.id).toBe(c.curve);
      expect(raw.typical_start_direction, c.id).toBe(c.start);
      expect(raw.typical_curvature, c.id).toBe(c.curve);

      const reqA = normalizeRequirements(raw, {});
      const reqB = normalizeRequirements({ ...raw }, {});
      expect(reqA.directional_target_numeric, c.id).toEqual(
        reqB.directional_target_numeric
      );
      expect(reqA.head_launch_target, c.id).toEqual(reqB.head_launch_target);
    }
  });
});

describe("B1c strike-pattern visual option maps", () => {
  it("exposes all seven strike_pattern enums in questionnaire order", () => {
    expect([...STRIKE_PATTERN_ENUMS]).toEqual([
      "CENTRE",
      "HEEL",
      "TOE",
      "HIGH_FACE",
      "LOW_FACE",
      "VARIABLE",
      "UNKNOWN",
    ]);
  });

  it("preserves RadioCards labels", () => {
    expect(STRIKE_PATTERN_LABELS).toEqual({
      CENTRE: "Centre",
      HEEL: "Heel",
      TOE: "Toe",
      HIGH_FACE: "High on the face",
      LOW_FACE: "Low on the face",
      VARIABLE: "Varies",
      UNKNOWN: "I'm not sure",
    });
    expect(strikePatternEnumForLabel("Heel")).toBe("HEEL");
    expect(strikePatternEnumForLabel("Toe")).toBe("TOE");
    expect(strikePatternEnumForLabel("High on the face")).toBe("HIGH_FACE");
    expect(strikePatternEnumForLabel("Low on the face")).toBe("LOW_FACE");
    expect(strikePatternEnumForLabel("Varies")).toBe("VARIABLE");
    expect(strikePatternEnumForLabel("I'm not sure")).toBe("UNKNOWN");
    expect(isStrikePatternEnum("DRAW")).toBe(false);
  });

  it("keeps heel left of toe and high above low in the right-handed Figma view", () => {
    const heel = STRIKE_IMPACT_RH.HEEL[0];
    const toe = STRIKE_IMPACT_RH.TOE[0];
    const high = STRIKE_IMPACT_RH.HIGH_FACE[0];
    const low = STRIKE_IMPACT_RH.LOW_FACE[0];
    expect(heel.cx).toBeLessThan(toe.cx);
    expect(heel.cy).toBe(toe.cy);
    expect(high.cy).toBeLessThan(low.cy);
    expect(high.cx).toBe(low.cx);
    expect(STRIKE_IMPACT_RH.CENTRE[0]).toEqual({ cx: 60, cy: 36 });
    expect(STRIKE_IMPACT_RH.VARIABLE).toHaveLength(2);
  });

  it("mirrors heel and toe for left-handed view without changing enum meaning", () => {
    const heelRh = strikeImpactScreenX(STRIKE_IMPACT_RH.HEEL[0].cx, "RIGHT");
    const toeRh = strikeImpactScreenX(STRIKE_IMPACT_RH.TOE[0].cx, "RIGHT");
    const heelLh = strikeImpactScreenX(STRIKE_IMPACT_RH.HEEL[0].cx, "LEFT");
    const toeLh = strikeImpactScreenX(STRIKE_IMPACT_RH.TOE[0].cx, "LEFT");
    expect(heelRh).toBeLessThan(toeRh);
    expect(heelLh).toBeGreaterThan(toeLh);
    expect(strikeImpactScreenX(60, "LEFT")).toBe(60);

    for (const pattern of STRIKE_PATTERN_ENUMS) {
      for (const hand of ["RIGHT", "LEFT"] as const) {
        const { payload, raw } = validatedRaw(
          baseAnswers({
            handedness: hand,
            strike_pattern: pattern,
          })
        );
        expect(payload.strike_pattern).toBe(pattern);
        expect(payload.handedness).toBe(hand);
        expect(raw.strike_pattern).toBe(pattern);
      }
    }
  });
});
