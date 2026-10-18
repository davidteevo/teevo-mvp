import { DIMENSION_WEIGHTS, type DimensionName, type DimensionTrace } from "../types";

export function inactiveDim(
  name: DimensionName,
  reason: string
): DimensionTrace {
  return {
    active: false,
    nominal_weight: DIMENSION_WEIGHTS[name],
    reliability: 0,
    score: null,
    omission_reason: reason,
  };
}

export function activeDim(
  name: DimensionName,
  reliability: number,
  score: number
): DimensionTrace {
  return {
    active: true,
    nominal_weight: DIMENSION_WEIGHTS[name],
    reliability,
    score,
  };
}

export function numField(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
