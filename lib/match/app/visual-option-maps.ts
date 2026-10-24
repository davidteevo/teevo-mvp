/** Canonical typical_trajectory enums (validate-inputs.ts). */
export const TRAJECTORY_ENUMS = ["LOW", "MID", "HIGH", "UNKNOWN"] as const;

export type TrajectoryEnum = (typeof TRAJECTORY_ENUMS)[number];

export const TRAJECTORY_LABELS: Record<TrajectoryEnum, string> = {
  LOW: "Low",
  MID: "Mid",
  HIGH: "High",
  UNKNOWN: "Not sure",
};

/** Canonical typical_start_direction enums. */
export const START_DIRECTION_ENUMS = [
  "LEFT",
  "CENTRE",
  "RIGHT",
  "VARIABLE",
  "UNKNOWN",
] as const;

export type StartDirectionEnum = (typeof START_DIRECTION_ENUMS)[number];

/** Questionnaire RadioCards titles (preserved). */
export const START_DIRECTION_LABELS: Record<StartDirectionEnum, string> = {
  LEFT: "Left",
  CENTRE: "Centre",
  RIGHT: "Right",
  VARIABLE: "Varies",
  UNKNOWN: "Not sure",
};

/** Refinement typical_start_direction titles. */
export const START_DIRECTION_REFINE_LABELS: Record<StartDirectionEnum, string> =
  {
    LEFT: "Starts left",
    CENTRE: "Starts on line",
    RIGHT: "Starts right",
    VARIABLE: "Varies",
    UNKNOWN: "Not sure",
  };

/** Canonical typical_curvature enums. */
export const CURVATURE_ENUMS = [
  "LEFT",
  "STRAIGHT",
  "RIGHT",
  "VARIABLE",
  "UNKNOWN",
] as const;

export type CurvatureEnum = (typeof CURVATURE_ENUMS)[number];

/** Questionnaire RadioCards titles (preserved). */
export const CURVATURE_LABELS: Record<CurvatureEnum, string> = {
  LEFT: "Curves left",
  STRAIGHT: "Mostly straight",
  RIGHT: "Curves right",
  VARIABLE: "Varies",
  UNKNOWN: "Not sure",
};

export const CURVATURE_UNKNOWN_REFINE_LABELS: Record<CurvatureEnum, string> = {
  LEFT: "Curves left",
  STRAIGHT: "Mostly straight",
  RIGHT: "Curves right",
  VARIABLE: "Varies a lot",
  UNKNOWN: "Not sure",
};

export const CURVATURE_VARIABLE_CLARIFY_LABELS: Record<CurvatureEnum, string> =
  {
    VARIABLE: "Still miss both ways",
    LEFT: "More often curves left",
    RIGHT: "More often curves right",
    STRAIGHT: "More often straight",
    UNKNOWN: "Not sure",
  };

/** Order for variable-clarify refinement radios. */
export const CURVATURE_VARIABLE_CLARIFY_ORDER: CurvatureEnum[] = [
  "VARIABLE",
  "LEFT",
  "RIGHT",
  "STRAIGHT",
  "UNKNOWN",
];

export const CURVATURE_PATHWAY_C_LABELS: Record<CurvatureEnum, string> = {
  LEFT: "Curves left",
  STRAIGHT: "Mostly straight",
  RIGHT: "Curves right",
  VARIABLE: "Varies / both ways",
  UNKNOWN: "Not sure",
};

/** Pure mapping helpers for unit tests (no React). */
export function trajectoryEnumForLabel(title: string): TrajectoryEnum | null {
  const entry = (
    Object.entries(TRAJECTORY_LABELS) as [TrajectoryEnum, string][]
  ).find(([, label]) => label === title);
  return entry ? entry[0] : null;
}

export function startDirectionEnumForLabel(
  title: string
): StartDirectionEnum | null {
  const entry = (
    Object.entries(START_DIRECTION_LABELS) as [StartDirectionEnum, string][]
  ).find(([, label]) => label === title);
  return entry ? entry[0] : null;
}

export function curvatureEnumForLabel(title: string): CurvatureEnum | null {
  const entry = (
    Object.entries(CURVATURE_LABELS) as [CurvatureEnum, string][]
  ).find(([, label]) => label === title);
  return entry ? entry[0] : null;
}

export function isTrajectoryEnum(value: string): value is TrajectoryEnum {
  return (TRAJECTORY_ENUMS as readonly string[]).includes(value);
}

export function isStartDirectionEnum(
  value: string
): value is StartDirectionEnum {
  return (START_DIRECTION_ENUMS as readonly string[]).includes(value);
}

export function isCurvatureEnum(value: string): value is CurvatureEnum {
  return (CURVATURE_ENUMS as readonly string[]).includes(value);
}

/** Canonical strike_pattern enums (validate-inputs.ts). Order matches the questionnaire. */
export const STRIKE_PATTERN_ENUMS = [
  "CENTRE",
  "HEEL",
  "TOE",
  "HIGH_FACE",
  "LOW_FACE",
  "VARIABLE",
  "UNKNOWN",
] as const;

export type StrikePatternEnum = (typeof STRIKE_PATTERN_ENUMS)[number];

/** Questionnaire titles preserved from the previous RadioCards. */
export const STRIKE_PATTERN_LABELS: Record<StrikePatternEnum, string> = {
  CENTRE: "Centre",
  HEEL: "Heel",
  TOE: "Toe",
  HIGH_FACE: "High on the face",
  LOW_FACE: "Low on the face",
  VARIABLE: "Varies",
  UNKNOWN: "I'm not sure",
};

export type StrikeHandedness = "LEFT" | "RIGHT" | "";

/** Impact centres in the 120×72 Figma clubface (right-handed orientation). */
export const STRIKE_IMPACT_RH: Record<
  Exclude<StrikePatternEnum, "UNKNOWN">,
  ReadonlyArray<{ cx: number; cy: number }>
> = {
  CENTRE: [{ cx: 60, cy: 36 }],
  HEEL: [{ cx: 35, cy: 36 }],
  TOE: [{ cx: 85, cy: 36 }],
  HIGH_FACE: [{ cx: 60, cy: 17 }],
  LOW_FACE: [{ cx: 60, cy: 55 }],
  VARIABLE: [
    { cx: 35, cy: 25 },
    { cx: 84, cy: 45 },
  ],
};

/**
 * Screen X after optional left-handed mirror.
 * Figma draws the hosel side on the left (right-handed address view).
 * Left-handed golfers see that face mirrored so heel stays nearest the hosel.
 * The stored enum does not change.
 */
export function strikeImpactScreenX(
  cx: number,
  handedness: StrikeHandedness
): number {
  if (handedness === "LEFT") return 120 - cx;
  return cx;
}

export function strikePatternEnumForLabel(
  title: string
): StrikePatternEnum | null {
  const entry = (
    Object.entries(STRIKE_PATTERN_LABELS) as [StrikePatternEnum, string][]
  ).find(([, label]) => label === title);
  return entry ? entry[0] : null;
}

export function isStrikePatternEnum(value: string): value is StrikePatternEnum {
  return (STRIKE_PATTERN_ENUMS as readonly string[]).includes(value);
}
