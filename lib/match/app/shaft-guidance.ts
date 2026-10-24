import type { ShaftGuidance } from "../catalogue-types";
import type { NormalisedRequirements } from "../types";

function flexPoint(value: number): string {
  if (value < 1.25) return "softer";
  if (value < 2.25) return "regular";
  if (value < 3.25) return "regular–stiff";
  if (value < 4.25) return "stiff";
  return "extra-stiff";
}

function flexBandLabel(min: number | null, max: number | null): string | null {
  if (min == null || max == null) return null;
  // A wide window comes from an approximate speed. Do not name one flex.
  if (max - min > 1.5) {
    return `About ${flexPoint(min)} through ${flexPoint(max)} flex. An approximate speed is a range, not one shaft flex.`;
  }
  // Frozen numeric flex: 0–5 maps broadly L→X; keep labels qualitative.
  const mid = (min + max) / 2;
  if (mid < 1.25) return "Softer flex territory (approx. Ladies–Senior)";
  if (mid < 2.25) return "Regular flex territory";
  if (mid < 3.25) return "Regular–Stiff flex territory";
  if (mid < 4.25) return "Stiff flex territory";
  return "Extra-stiff flex territory";
}

function weightLabel(min: number | null, max: number | null): string | null {
  if (min == null || max == null) return null;
  return `About ${Math.round(min)}–${Math.round(max)} g (exact shaft mass must be confirmed on a listing)`;
}

function launchLabel(target: string): string | null {
  if (!target || target === "UNRESOLVED" || target === "ANY") return null;
  const map: Record<string, string> = {
    LOW: "Lower-launch shaft profile",
    MID_LOW: "Mid-low launch shaft profile",
    MID: "Mid-launch shaft profile",
    MID_HIGH: "Mid-high launch shaft profile",
    HIGH: "Higher-launch shaft profile",
  };
  return map[target] ?? null;
}

/**
 * Shaft guidance from normalised requirements only.
 * Never names a specific shaft SKU or claims head/shaft compatibility.
 */
export function buildShaftGuidance(req: NormalisedRequirements): ShaftGuidance {
  const flex_label = flexBandLabel(
    req.shaft_flex_min_value,
    req.shaft_flex_max_value
  );
  const weight_label = weightLabel(
    req.shaft_weight_min_g,
    req.shaft_weight_max_g
  );
  const launch_label = launchLabel(req.shaft_launch_target);
  const notes: string[] = [
    "Shaft advice here describes target characteristics, not a fitted or available shaft.",
    "A catalogue head recommendation does not prove a compatible shaft exists for that head.",
  ];
  if (!flex_label && !weight_label) {
    notes.push(
      "Provide swing speed (or carry) to refine flex and weight guidance."
    );
  }
  if (req.conflict_flags.includes("SPEED_CARRY_CONFLICT")) {
    const estimated = req.requirement_confidence.flex?.source_codes.includes(
      "ESTIMATED_SPEED"
    );
    notes.push(
      estimated
        ? "Estimated speed and carry suggest different flex territories — treat flex guidance cautiously."
        : "Measured speed and carry suggest different flex territories — treat flex guidance cautiously."
    );
  }

  return {
    available: !!(flex_label || weight_label || launch_label),
    flex_label,
    weight_label,
    launch_label,
    notes,
  };
}
