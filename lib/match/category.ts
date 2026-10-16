import type { DirectionCategory, LaunchCategory } from "./types";

/** Nearest ordinal knot; half ties away from zero (RULES D02). */
export function launchCategoryFromNumeric(
  x: number | null | undefined
): LaunchCategory {
  if (x == null) return "UNRESOLVED";
  const mag = Math.abs(x);
  const n = mag < 0.5 ? 0 : mag < 1.5 ? 1 : 2;
  const signed = n === 0 ? 0 : x > 0 ? n : -n;
  return (["LOW", "MID_LOW", "MID", "MID_HIGH", "HIGH"] as const)[signed + 2];
}

export function directionCategoryFromNumeric(
  x: number | null | undefined
): DirectionCategory {
  if (x == null) return "UNRESOLVED";
  const mag = Math.abs(x);
  const n = mag < 0.5 ? 0 : mag < 1.5 ? 1 : 2;
  const signed = n === 0 ? 0 : x > 0 ? n : -n;
  return (
    [
      "STRONG_FADE_ASSIST",
      "FADE_ASSIST",
      "NEUTRAL",
      "DRAW_ASSIST",
      "STRONG_DRAW_ASSIST",
    ] as const
  )[signed + 2];
}

export function targetCategories(value: number | null | undefined): {
  launch: LaunchCategory;
  direction: DirectionCategory;
} {
  return {
    launch: launchCategoryFromNumeric(value),
    direction: directionCategoryFromNumeric(value),
  };
}

export function directionBiasToNumeric(bias: string | null | undefined): number | null {
  switch ((bias || "").toUpperCase()) {
    case "STRONG_FADE":
      return -2;
    case "FADE":
      return -1;
    case "NEUTRAL":
      return 0;
    case "DRAW":
      return 1;
    case "STRONG_DRAW":
      return 2;
    default:
      return null;
  }
}

export function launchTendencyToNumeric(
  tendency: string | null | undefined
): number | null {
  switch ((tendency || "").toUpperCase()) {
    case "LOW":
      return -2;
    case "MID_LOW":
      return -1;
    case "MID":
      return 0;
    case "MID_HIGH":
      return 1;
    case "HIGH":
      return 2;
    case "LOW_MID":
      return -1.5;
    default:
      return null;
  }
}

export function evidenceReliability(band: string | null | undefined): number {
  switch ((band || "").toUpperCase()) {
    case "HIGH":
      return 1;
    case "MEDIUM":
      return 0.85;
    case "LOW":
      return 0.5;
    default:
      return 0;
  }
}
