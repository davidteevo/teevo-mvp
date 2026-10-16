/** Gap → score curves from Logic §§27–34 with linear interpolation between knots. */

function lerpKnots(gap: number, knots: Array<[number, number]>): number {
  if (gap <= knots[0][0]) return knots[0][1];
  for (let i = 1; i < knots.length; i++) {
    const [g0, s0] = knots[i - 1];
    const [g1, s1] = knots[i];
    if (gap <= g1) {
      if (g1 === g0) return s1;
      const t = (gap - g0) / (g1 - g0);
      return s0 + t * (s1 - s0);
    }
  }
  return knots[knots.length - 1][1];
}

const MINIMUM: Array<[number, number]> = [
  [0, 100],
  [0.5, 90],
  [1, 80],
  [1.5, 67.5],
  [2, 55],
  [3, 30],
  [4, 0],
];

const DIRECTION: Array<[number, number]> = [
  [0, 100],
  [0.5, 92.5],
  [1, 85],
  [2, 60],
  [3, 35],
  [4, 15],
];

const LAUNCH: Array<[number, number]> = [
  [0, 100],
  [0.5, 92.5],
  [1, 85],
  [2, 65],
  [3, 40],
  [4, 20],
];

/** Step curves: score for gap up to and including each threshold; next score after. */
function stepCurve(
  gap: number,
  steps: Array<[number, number]>,
  beyond: number
): number {
  for (const [limit, score] of steps) {
    if (gap <= limit) return score;
  }
  return beyond;
}

export function scoreMinimumNeed(gap: number): number {
  return lerpKnots(Math.max(0, gap), MINIMUM);
}

export function scoreDirection(gap: number): number {
  return lerpKnots(Math.max(0, gap), DIRECTION);
}

export function scoreLaunch(gap: number): number {
  return lerpKnots(Math.max(0, gap), LAUNCH);
}

export function scoreLoft(gap: number): number {
  // Inside = 0 → 100; ≤0.5 → 90; ≤1 → 75; ≤1.5 → 55; >1.5 → 30
  if (gap <= 0) return 100;
  return stepCurve(
    gap,
    [
      [0.5, 90],
      [1, 75],
      [1.5, 55],
    ],
    30
  );
}

export function scoreFlex(gap: number): number {
  if (gap <= 0) return 100;
  return stepCurve(
    gap,
    [
      [0.5, 90],
      [1, 75],
      [1.5, 55],
      [2, 35],
    ],
    0
  );
}

export function scoreWeight(gap: number): number {
  if (gap <= 0) return 100;
  return stepCurve(
    gap,
    [
      [5, 85],
      [10, 65],
      [15, 40],
    ],
    20
  );
}

export type DimensionCurveName =
  | "minimum"
  | "direction"
  | "launch"
  | "loft"
  | "flex"
  | "weight";

export function scoreDimensionCurve(
  dimension: DimensionCurveName,
  gap: number
): number {
  switch (dimension) {
    case "minimum":
      return scoreMinimumNeed(gap);
    case "direction":
      return scoreDirection(gap);
    case "launch":
      return scoreLaunch(gap);
    case "loft":
      return scoreLoft(gap);
    case "flex":
      return scoreFlex(gap);
    case "weight":
      return scoreWeight(gap);
  }
}
