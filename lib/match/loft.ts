export type LoftReachableInput = {
  mode: string;
  stated: number;
  min?: number;
  max?: number;
  settings?: number[];
};

export function loftReachable(input: LoftReachableInput): number[] {
  const mode = (input.mode || "NONE").toUpperCase();
  const stated = input.stated;
  if (mode === "DELTA_RANGE") {
    const min = input.min ?? 0;
    const max = input.max ?? 0;
    return [stated + min, stated + max];
  }
  if (mode === "PUBLISHED_SETTINGS") {
    if (Array.isArray(input.settings) && input.settings.length > 0) {
      return [...input.settings];
    }
    if (input.min != null && input.max != null) {
      return [input.min, input.max];
    }
    return [stated];
  }
  // NONE, FACE_ANGLE_ONLY, LIE_ONLY, UNKNOWN
  return [stated];
}

export function rangeGap(
  valueOrReachable: number | number[],
  min: number,
  max: number
): number {
  const values = Array.isArray(valueOrReachable)
    ? valueOrReachable
    : [valueOrReachable];
  let best = Infinity;
  for (const v of values) {
    if (v >= min && v <= max) return 0;
    if (v < min) best = Math.min(best, min - v);
    else best = Math.min(best, v - max);
  }
  return best;
}
