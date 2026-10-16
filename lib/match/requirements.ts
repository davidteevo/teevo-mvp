import {
  directionCategoryFromNumeric,
  launchCategoryFromNumeric,
} from "./category";
import { carryRegion, speedRegion } from "./regions";
import {
  DIMENSION_NAMES,
  type DimensionName,
  type NormalisedRequirements,
  type RawGolferInputs,
  type RequirementConfidenceEntry,
} from "./types";
import { sortedSetValues } from "./util";

function clamp(x: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, x));
}

function asNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function asStr(v: unknown): string | null {
  if (v == null) return null;
  return String(v);
}

export function normalizeRequirements(
  raw: RawGolferInputs,
  headsByKey: Record<string, Record<string, unknown>>
): NormalisedRequirements {
  const src: Record<DimensionName, Set<string>> = Object.fromEntries(
    DIMENSION_NAMES.map((k) => [k, new Set<string>()])
  ) as Record<DimensionName, Set<string>>;
  const flags = new Set<string>();
  let g = 3;
  let f = 3;
  let w = 2;
  for (const k of ["forgiveness", "stability", "workability"] as const) {
    src[k].add("BASELINE");
  }

  const handedness = (asStr(raw.handedness) || "RIGHT") as "LEFT" | "RIGHT";
  const handicap = asNum(raw.handicap);
  const strike = asStr(raw.strike_consistency);
  const obj = asStr(raw.primary_objective);
  const traj = asStr(raw.typical_trajectory);
  const start = asStr(raw.typical_start_direction);
  const curve = asStr(raw.typical_curvature);
  const severity = asStr(raw.miss_severity) || "UNKNOWN";
  const speed = asNum(raw.club_speed_mph);
  const carry = asNum(raw.carry_distance_yards);
  const inputConfidence = (asStr(raw.input_confidence) || "HIGH") as
    | "HIGH"
    | "MEDIUM"
    | "LOW";

  const mod = (a: number, b: number, c: number, source: string) => {
    g += a;
    f += b;
    w += c;
    for (const [k, v] of [
      ["forgiveness", a],
      ["stability", b],
      ["workability", c],
    ] as const) {
      if (v) src[k].add(source);
    }
  };

  if (handicap != null) {
    if (handicap < 6) mod(0, 0, 0.5, "HANDICAP");
    else if (handicap < 13) mod(0, 0, 0, "HANDICAP");
    else if (handicap < 21) mod(0.25, 0.25, 0, "HANDICAP");
    else if (handicap < 31) mod(0.5, 0.5, -0.25, "HANDICAP");
    else mod(0.75, 0.75, -0.5, "HANDICAP");
  }

  if (strike === "HIGH" || strike === "MEDIUM" || strike === "LOW") {
    const m =
      strike === "HIGH"
        ? ([-0.5, -0.5, 0.5] as const)
        : strike === "MEDIUM"
          ? ([0, 0, 0] as const)
          : ([1, 1.5, -0.5] as const);
    mod(m[0], m[1], m[2], "STRIKE_CONSISTENCY");
    for (const k of ["forgiveness", "stability", "workability"] as const) {
      src[k].add("STRIKE_CONSISTENCY");
    }
  }
  if (asStr(raw.strike_pattern) === "VARIABLE") {
    mod(0.5, 0.5, 0, "STRIKE_PATTERN");
  }

  const sign = handedness === "RIGHT" ? 1 : -1;
  const a =
    ({ LEFT: -0.5, RIGHT: 0.5 } as Record<string, number>)[start || ""] != null
      ? ({ LEFT: -0.5, RIGHT: 0.5 } as Record<string, number>)[start!] * sign
      : 0;
  const b =
    ({ LEFT: -1.5, RIGHT: 1.5 } as Record<string, number>)[curve || ""] != null
      ? ({ LEFT: -1.5, RIGHT: 1.5 } as Record<string, number>)[curve!] * sign
      : 0;
  const stable =
    start === "LEFT" ||
    start === "CENTRE" ||
    start === "RIGHT" ||
    curve === "LEFT" ||
    curve === "STRAIGHT" ||
    curve === "RIGHT";
  const rawDir = a + b;
  const sevMul =
    ({ SMALL: 0.67, MODERATE: 1, LARGE: 1.33, UNKNOWN: 1 } as Record<
      string,
      number
    >)[severity] ?? 1;
  const ds = clamp(rawDir * sevMul, -2, 2);
  const os =
    obj === "REDUCE_RIGHT_MISS"
      ? 1.5 * sign
      : obj === "REDUCE_LEFT_MISS"
        ? -1.5 * sign
        : null;

  let direction: number | null;
  if (curve === "VARIABLE") {
    direction = null;
    flags.add("TWO_WAY_MISS");
    mod(1, 1.5, 0, "BALL_FLIGHT");
  } else {
    direction = stable ? clamp(ds + 0.5 * (os ?? 0), -2, 2) : os;
    if (stable) src.direction.add("BALL_FLIGHT");
    if (os != null) src.direction.add("PRIMARY_OBJECTIVE");
    if (rawDir && severity !== "UNKNOWN") {
      const sm =
        ({ SMALL: [0.25, 0.25, 0], MODERATE: [0.5, 0.5, 0], LARGE: [0.75, 1, 0] } as Record<
          string,
          [number, number, number]
        >)[severity];
      if (sm) mod(sm[0], sm[1], sm[2], "BALL_FLIGHT");
    }
    if (
      os != null &&
      ds * os < 0 &&
      Math.abs(ds) >= 1 &&
      Math.abs(os) >= 1
    ) {
      flags.add("DIRECTION_INPUT_CONFLICT");
    }
    if (
      (start === "UNKNOWN") !== (curve === "UNKNOWN") ||
      start === "VARIABLE"
    ) {
      flags.add("DIRECTION_EVIDENCE_PARTIAL");
    }
  }

  const objMod =
    (
      {
        FORGIVENESS: [1.5, 1, -0.5],
        ACCURACY: [0.5, 1.5, 0],
        CONTROL: [-0.25, 1, 1.5],
      } as Record<string, [number, number, number]>
    )[obj || ""] ?? ([0, 0, 0] as [number, number, number]);
  mod(objMod[0], objMod[1], objMod[2], "PRIMARY_OBJECTIVE");

  const ts =
    traj === "LOW" ? 1 : traj === "MID" ? 0 : traj === "HIGH" ? -1 : null;
  const hs =
    obj === "HIGHER_FLIGHT" ? 1.5 : obj === "LOWER_FLIGHT" ? -1.5 : null;
  const launch =
    ts == null && hs == null ? null : clamp((ts ?? 0) + (hs ?? 0), -2, 2);
  const shaftlaunch =
    launch == null
      ? null
      : clamp(
          (ts ?? 0) * 0.5 +
            (hs == null ? 0 : hs > 0 ? 0.5 : -0.5),
          -2,
          2
        );
  if (ts != null) {
    src.head_launch.add("TRAJECTORY");
    src.shaft_launch.add("TRAJECTORY");
  }
  if (hs != null) {
    src.head_launch.add("PRIMARY_OBJECTIVE");
    src.shaft_launch.add("PRIMARY_OBJECTIVE");
  }
  if (ts != null && hs != null && ts * hs < 0) {
    flags.add("LAUNCH_INPUT_CONFLICT");
  }

  const currentKey = asStr(raw.current_driver_key);
  const current = currentKey ? headsByKey[currentKey] : undefined;
  const resolved = current != null;
  const satisfaction = asStr(raw.current_club_satisfaction) || "UNKNOWN";
  const intent: NormalisedRequirements["recommendation_intent"] =
    !resolved || satisfaction === "UNKNOWN"
      ? "UNANCHORED"
      : satisfaction === "HIGH"
        ? "PRESERVE"
        : satisfaction === "MEDIUM"
          ? "OPTIMISE"
          : "CORRECT";

  const currentLoft = asNum(raw.current_loft_deg);
  const usable =
    resolved &&
    String(current!.driver_subtype || "").toUpperCase() === "STANDARD" &&
    currentLoft != null &&
    currentLoft > 0 &&
    (satisfaction === "HIGH" || satisfaction === "MEDIUM");

  let flex: [number, number] | null = null;
  let weight: [number, number] | null = null;
  let loft: [number, number] | null = null;

  if (speed != null && speed > 0) {
    const region = speedRegion(speed);
    flex = region.flex;
    weight = region.weight;
    loft = region.loft;
    for (const k of ["flex", "weight", "loft"] as const) {
      src[k].add("MEASURED_SPEED");
    }
    if (carry != null && carry > 0) {
      const cFlex = carryRegion(carry).flex;
      if (Math.abs((flex[0] + flex[1]) / 2 - (cFlex[0] + cFlex[1]) / 2) >= 1) {
        flags.add("SPEED_CARRY_CONFLICT");
      }
    }
  } else {
    if (carry != null && carry > 0) {
      flex = carryRegion(carry).flex;
      src.flex.add("CARRY_PROXY");
    }
    if (usable) {
      loft = [currentLoft! - 1, currentLoft! + 1];
      src.loft.add("CURRENT_LOFT");
    }
  }

  if (loft != null) {
    const shift = clamp(
      (ts ?? 0) * 0.5 + (hs == null ? 0 : hs > 0 ? 0.5 : -0.5),
      -1,
      1
    );
    loft = [loft[0] + shift, loft[1] + shift];
    // RULES/authoring: only non-zero trajectory/objective contributions add loft sources
    // (MID trajectory contributes 0 and must not add TRAJECTORY).
    if (ts) src.loft.add("TRAJECTORY");
    if (hs) src.loft.add("PRIMARY_OBJECTIVE");
    if (
      speed != null &&
      usable &&
      Math.max(loft[0] - currentLoft!, currentLoft! - loft[1], 0) > 1
    ) {
      flags.add("LOFT_EVIDENCE_CONFLICT");
    }
  }

  const active: Record<DimensionName, boolean> = {
    forgiveness: true,
    stability: true,
    workability: true,
    direction: direction != null,
    head_launch: launch != null,
    shaft_launch: shaftlaunch != null,
    head_spin: false,
    shaft_spin: false,
    loft: loft != null,
    flex: flex != null,
    weight: weight != null,
  };

  const affected: Record<string, DimensionName[]> = {
    SPEED_CARRY_CONFLICT: ["flex", "weight", "loft"],
    DIRECTION_INPUT_CONFLICT: ["direction"],
    DIRECTION_EVIDENCE_PARTIAL: ["direction"],
    TWO_WAY_MISS: ["direction"],
    LAUNCH_INPUT_CONFLICT: ["head_launch", "shaft_launch", "loft"],
    LOFT_EVIDENCE_CONFLICT: ["loft"],
  };

  const conf = {} as Record<DimensionName, RequirementConfidenceEntry>;
  for (const k of DIMENSION_NAMES) {
    const cf = Object.keys(affected)
      .filter((code) => flags.has(code) && affected[code].includes(k))
      .sort();
    let sources = sortedSetValues(src[k]);
    let band: RequirementConfidenceEntry["band"];
    if (!active[k]) {
      band = "UNRESOLVED";
      sources = [];
    } else {
      let n =
        sources.includes("MEASURED_SPEED")
          ? 3
          : sources.includes("CARRY_PROXY")
            ? 1
            : sources.some((s) => s !== "BASELINE" && s !== "HANDICAP")
              ? 2
              : 1;
      n = Math.min(
        n,
        { HIGH: 3, MEDIUM: 2, LOW: 1 }[inputConfidence]
      );
      if (cf.length) n = Math.max(1, n - 1);
      band = ({ 1: "LOW", 2: "MEDIUM", 3: "HIGH" } as const)[n as 1 | 2 | 3];
    }
    conf[k] = { band, source_codes: sources, conflict_codes: cf };
  }

  return {
    handedness,
    recommendation_intent: intent,
    head_launch_target: launchCategoryFromNumeric(launch),
    head_launch_target_numeric: launch,
    head_spin_target: "UNRESOLVED",
    forgiveness_requirement: clamp(g, 1, 5),
    stability_requirement: clamp(f, 1, 5),
    directional_target_numeric: direction,
    directional_requirement: directionCategoryFromNumeric(direction),
    workability_preference: clamp(w, 1, 5),
    driver_subtype_allowed: "STANDARD",
    preferred_loft_min_deg: loft ? loft[0] : null,
    preferred_loft_max_deg: loft ? loft[1] : null,
    shaft_weight_min_g: weight ? weight[0] : null,
    shaft_weight_max_g: weight ? weight[1] : null,
    shaft_flex_min_value: flex ? flex[0] : null,
    shaft_flex_max_value: flex ? flex[1] : null,
    shaft_launch_target: launchCategoryFromNumeric(shaftlaunch),
    shaft_launch_target_numeric: shaftlaunch,
    shaft_spin_target: "UNRESOLVED",
    shaft_torque_target_deg: null,
    conflict_flags: sortedSetValues(flags),
    requirement_confidence: conf,
  };
}

export function golferEvidenceConfidence(
  raw: RawGolferInputs,
  flags: string[]
): number {
  let score = 100;
  const speed = asNum(raw.club_speed_mph);
  const carry = asNum(raw.carry_distance_yards);
  if (speed == null) score -= carry != null ? 10 : 25;

  const unknownChecks: Array<[string, number]> = [
    ["typical_start_direction", 4],
    ["typical_curvature", 6],
    ["typical_trajectory", 6],
    ["strike_consistency", 6],
    ["primary_objective", 8],
  ];
  for (const [name, penalty] of unknownChecks) {
    const v = asStr(raw[name]);
    if (v == null || v === "UNKNOWN") score -= penalty;
  }

  const miss =
    asStr(raw.typical_curvature) === "VARIABLE" ||
    asStr(raw.typical_start_direction) === "LEFT" ||
    asStr(raw.typical_start_direction) === "RIGHT" ||
    asStr(raw.typical_curvature) === "LEFT" ||
    asStr(raw.typical_curvature) === "RIGHT";
  if (miss && asStr(raw.miss_severity) === "UNKNOWN") score -= 3;
  if (asNum(raw.handicap) == null) score -= 2;

  const ic = asStr(raw.input_confidence) || "HIGH";
  score -= ic === "MEDIUM" ? 5 : ic === "LOW" ? 15 : 0;

  if (flags.includes("DIRECTION_INPUT_CONFLICT")) score -= 10;
  if (flags.includes("SPEED_CARRY_CONFLICT")) score -= 5;
  if (
    flags.includes("LAUNCH_INPUT_CONFLICT") ||
    flags.includes("LOFT_EVIDENCE_CONFLICT")
  ) {
    score -= 5;
  }
  if (
    asStr(raw.typical_start_direction) === "VARIABLE" ||
    asStr(raw.typical_curvature) === "VARIABLE"
  ) {
    score -= 5;
  }

  return clamp(score, 0, 100);
}
