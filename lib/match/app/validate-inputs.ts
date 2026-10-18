import type { RawGolferInputs } from "../types";

const HANDEDNESS = new Set(["LEFT", "RIGHT"]);
const TRAJECTORY = new Set(["LOW", "MID", "HIGH", "UNKNOWN"]);
const START_DIR = new Set(["LEFT", "CENTRE", "RIGHT", "VARIABLE", "UNKNOWN"]);
const CURVATURE = new Set(["LEFT", "STRAIGHT", "RIGHT", "VARIABLE", "UNKNOWN"]);
const MISS = new Set(["SMALL", "MODERATE", "LARGE", "UNKNOWN"]);
const STRIKE_PATTERN = new Set([
  "HEEL",
  "TOE",
  "HIGH_FACE",
  "LOW_FACE",
  "CENTRE",
  "VARIABLE",
  "UNKNOWN",
]);
const STRIKE_CONSISTENCY = new Set(["LOW", "MEDIUM", "HIGH", "UNKNOWN"]);
const OBJECTIVE = new Set([
  "FORGIVENESS",
  "ACCURACY",
  "REDUCE_RIGHT_MISS",
  "REDUCE_LEFT_MISS",
  "DISTANCE",
  "HIGHER_FLIGHT",
  "LOWER_FLIGHT",
  "CONTROL",
  "UNKNOWN",
]);
const SATISFACTION = new Set(["HIGH", "MEDIUM", "LOW", "UNKNOWN"]);

function asEnum(
  value: unknown,
  allowed: Set<string>,
  field: string,
  errors: string[]
): string | null {
  if (value == null || value === "") return null;
  const s = String(value).toUpperCase();
  if (!allowed.has(s)) {
    errors.push(`${field}: invalid value`);
    return null;
  }
  return s;
}

function asOptionalNumber(
  value: unknown,
  field: string,
  errors: string[],
  opts?: { min?: number; max?: number; positive?: boolean }
): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    errors.push(`${field}: must be a finite number`);
    return null;
  }
  if (opts?.positive && !(n > 0)) {
    errors.push(`${field}: must be positive`);
    return null;
  }
  if (opts?.min != null && n < opts.min) {
    errors.push(`${field}: below minimum`);
    return null;
  }
  if (opts?.max != null && n > opts.max) {
    errors.push(`${field}: above maximum`);
    return null;
  }
  return n;
}

/**
 * Validate questionnaire payload into RawGolferInputs.
 * Handedness required; other fields optional / UNKNOWN.
 */
export function validateMatchQuestionnaireInputs(
  body: Record<string, unknown>
): { ok: true; raw: RawGolferInputs } | { ok: false; errors: string[] } {
  const errors: string[] = [];

  const handedness = asEnum(body.handedness, HANDEDNESS, "handedness", errors);
  if (!handedness) {
    if (!errors.some((e) => e.startsWith("handedness"))) {
      errors.push("handedness: required");
    }
  }

  const handicap = asOptionalNumber(body.handicap, "handicap", errors, {
    min: 0,
    max: 54,
  });
  const club_speed_mph = asOptionalNumber(
    body.club_speed_mph,
    "club_speed_mph",
    errors,
    { positive: true, max: 160 }
  );
  const carry_distance_yards = asOptionalNumber(
    body.carry_distance_yards,
    "carry_distance_yards",
    errors,
    { positive: true, max: 400 }
  );
  const current_loft_deg = asOptionalNumber(
    body.current_loft_deg,
    "current_loft_deg",
    errors,
    { positive: true, min: 5, max: 16 }
  );
  const budget_max_gbp = asOptionalNumber(
    body.budget_max_gbp,
    "budget_max_gbp",
    errors,
    { positive: true, max: 5000 }
  );

  const typical_trajectory =
    asEnum(body.typical_trajectory, TRAJECTORY, "typical_trajectory", errors) ??
    "UNKNOWN";
  const typical_start_direction =
    asEnum(
      body.typical_start_direction,
      START_DIR,
      "typical_start_direction",
      errors
    ) ?? "UNKNOWN";
  const typical_curvature =
    asEnum(body.typical_curvature, CURVATURE, "typical_curvature", errors) ??
    "UNKNOWN";
  const miss_severity =
    asEnum(body.miss_severity, MISS, "miss_severity", errors) ?? "UNKNOWN";
  const strike_pattern =
    asEnum(body.strike_pattern, STRIKE_PATTERN, "strike_pattern", errors) ??
    "UNKNOWN";
  const strike_consistency =
    asEnum(
      body.strike_consistency,
      STRIKE_CONSISTENCY,
      "strike_consistency",
      errors
    ) ?? "UNKNOWN";
  const primary_objective =
    asEnum(body.primary_objective, OBJECTIVE, "primary_objective", errors) ??
    "UNKNOWN";
  const current_club_satisfaction =
    asEnum(
      body.current_club_satisfaction,
      SATISFACTION,
      "current_club_satisfaction",
      errors
    ) ?? "UNKNOWN";

  // Derive input_confidence from completeness (not asked as jargon).
  let known = 0;
  let total = 0;
  const mark = (v: unknown, unknownish: boolean) => {
    total++;
    if (v != null && v !== "" && !unknownish) known++;
  };
  mark(handicap, false);
  mark(club_speed_mph, false);
  mark(carry_distance_yards, false);
  mark(typical_trajectory, typical_trajectory === "UNKNOWN");
  mark(typical_start_direction, typical_start_direction === "UNKNOWN");
  mark(typical_curvature, typical_curvature === "UNKNOWN");
  mark(miss_severity, miss_severity === "UNKNOWN");
  mark(strike_consistency, strike_consistency === "UNKNOWN");
  mark(primary_objective, primary_objective === "UNKNOWN");
  const ratio = total > 0 ? known / total : 0;
  const input_confidence =
    ratio >= 0.7 ? "HIGH" : ratio >= 0.4 ? "MEDIUM" : "LOW";

  if (errors.length > 0 || !handedness) {
    return { ok: false, errors: Array.from(new Set(errors)).sort() };
  }

  const raw: RawGolferInputs = {
    handedness,
    handicap,
    club_speed_mph,
    ball_speed_mph: null,
    launch_angle_deg: null,
    spin_rate_rpm: null,
    attack_angle_deg: null,
    carry_distance_yards,
    typical_trajectory,
    typical_start_direction,
    typical_curvature,
    miss_severity,
    strike_pattern,
    strike_consistency,
    current_driver_key: null,
    current_loft_deg,
    current_shaft_key: null,
    current_flex_raw: null,
    current_club_satisfaction,
    primary_objective,
    budget_max_gbp,
    input_source: "QUESTIONNAIRE",
    input_confidence,
  };

  return { ok: true, raw };
}
