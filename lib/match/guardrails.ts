import type { Band } from "./types";

export type GuardrailResult = {
  suppressed: boolean;
  ceiling: "GOOD_MATCH" | null;
};

export function guardrailForGap(
  dimension: "flex" | "loft" | "direction" | "head_launch" | "shaft_launch",
  gap: number | null | undefined
): GuardrailResult {
  if (gap == null || !Number.isFinite(gap)) {
    return { suppressed: false, ceiling: null };
  }
  if (dimension === "flex") {
    if (gap > 2) return { suppressed: true, ceiling: null };
    if (gap > 1.5) return { suppressed: false, ceiling: "GOOD_MATCH" };
    return { suppressed: false, ceiling: null };
  }
  if (dimension === "loft") {
    if (gap > 2.5) return { suppressed: true, ceiling: null };
    if (gap > 1.5) return { suppressed: false, ceiling: "GOOD_MATCH" };
    return { suppressed: false, ceiling: null };
  }
  if (dimension === "direction") {
    if (gap >= 4) return { suppressed: true, ceiling: null };
    if (gap >= 3) return { suppressed: false, ceiling: "GOOD_MATCH" };
    return { suppressed: false, ceiling: null };
  }
  return { suppressed: false, ceiling: null };
}

export function applyGuardrails(gaps: {
  flex: number | null;
  loft: number | null;
  direction: number | null;
  head_launch: number | null;
  shaft_launch: number | null;
}): { suppressed: boolean; ceiling: Band | null } {
  const flex = guardrailForGap("flex", gaps.flex);
  const loft = guardrailForGap("loft", gaps.loft);
  const direction = guardrailForGap("direction", gaps.direction);
  const suppressed =
    flex.suppressed || loft.suppressed || direction.suppressed;
  let ceiling: Band | null = null;
  if (flex.ceiling || loft.ceiling || direction.ceiling) {
    ceiling = "GOOD_MATCH";
  }
  if (
    gaps.head_launch != null &&
    gaps.shaft_launch != null &&
    gaps.head_launch >= 3 &&
    gaps.shaft_launch >= 3
  ) {
    ceiling = "GOOD_MATCH";
  }
  return { suppressed, ceiling };
}
