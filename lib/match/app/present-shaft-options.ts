import type { OemShaftOptionAssessment } from "./select-oem-shaft-options";
import type { NormalisedRequirements } from "../types";

export const OEM_SHAFT_OFFERING_NOTE =
  "Originally offered with this driver. Check the exact shaft, flex and loft when buying.";

export type PresentedShaftOption = {
  shaftKey: string;
  title: string;
  flexLabel: string | null;
  weightLabel: string | null;
  launchLabel: string | null;
  why: string;
  isPrimary: boolean;
};

export type PresentedShaftOptionsSection = {
  mode: "named" | "none";
  heading: string;
  offeringNote: string | null;
  primary: PresentedShaftOption | null;
  alternatives: PresentedShaftOption[];
  differenceNote: string | null;
  /** Suggested loft from golfer requirements — not a verified configuration. */
  suggestedLoftLabel: string | null;
};

function launchPlain(profile: string | null): string | null {
  if (!profile) return null;
  const key = profile.toUpperCase().replace(/\s+/g, "_");
  const map: Record<string, string> = {
    LOW: "lower launch",
    MID_LOW: "mid-low launch",
    MID: "mid launch",
    MID_HIGH: "mid-high launch",
    HIGH: "higher launch",
  };
  return map[key] ?? null;
}

function shaftTitle(option: OemShaftOptionAssessment): string {
  if (option.shaft_display_name?.trim()) return option.shaft_display_name.trim();
  const parts = [
    option.shaft_manufacturer,
    option.shaft_model,
    option.flex_label,
  ].filter((part): part is string => Boolean(part && part.trim()));
  return parts.join(" ") || option.shaft_key;
}

function weightLabel(option: OemShaftOptionAssessment): string | null {
  if (option.actual_weight_g == null || !Number.isFinite(option.actual_weight_g)) {
    return null;
  }
  return `About ${Math.round(option.actual_weight_g)} g recorded weight`;
}

function whyFits(
  option: OemShaftOptionAssessment,
  requirements: NormalisedRequirements
): string {
  const bits: string[] = [];
  if (option.dimensions.flex.active && option.flex_label) {
    bits.push(`${option.flex_label} flex suits the speed range you gave`);
  }
  if (
    option.dimensions.weight.active &&
    option.actual_weight_g != null &&
    requirements.shaft_weight_min_g != null
  ) {
    bits.push(
      `recorded weight near your ${Math.round(requirements.shaft_weight_min_g)}–${Math.round(requirements.shaft_weight_max_g!)} g range`
    );
  }
  const launch = launchPlain(option.launch_profile);
  if (option.dimensions.shaft_launch.active && launch) {
    bits.push(`${launch} profile matches the flight evidence we could use`);
  }
  if (bits.length === 0) {
    return "Verified as an original manufacturer option for this driver head.";
  }
  return `${bits[0].charAt(0).toUpperCase()}${bits[0].slice(1)}.`;
}

function differenceNote(
  primary: OemShaftOptionAssessment,
  secondary: OemShaftOptionAssessment
): string | null {
  const diffs: string[] = [];
  if (
    primary.flex_label &&
    secondary.flex_label &&
    primary.flex_label !== secondary.flex_label
  ) {
    diffs.push(
      `${primary.flex_label} versus ${secondary.flex_label} flex`
    );
  }
  if (
    primary.actual_weight_g != null &&
    secondary.actual_weight_g != null &&
    Math.round(primary.actual_weight_g) !== Math.round(secondary.actual_weight_g)
  ) {
    diffs.push(
      `about ${Math.round(primary.actual_weight_g)} g versus ${Math.round(secondary.actual_weight_g)} g recorded weight`
    );
  }
  const a = launchPlain(primary.launch_profile);
  const b = launchPlain(secondary.launch_profile);
  if (a && b && a !== b) {
    diffs.push(`${a} versus ${b}`);
  }
  if (diffs.length === 0) {
    if (
      primary.suitability_score != null &&
      secondary.suitability_score != null &&
      primary.suitability_score === secondary.suitability_score
    ) {
      return "Both score equally on the shaft characteristics we could assess. They are different original shaft families for this head.";
    }
    return "A different original shaft family for this head.";
  }
  const equal =
    primary.suitability_score != null &&
    secondary.suitability_score != null &&
    primary.suitability_score === secondary.suitability_score;
  const lead = equal
    ? "Both are strong on the assessed characteristics. Main differences: "
    : "Compared with the first option: ";
  return `${lead}${diffs.join("; ")}.`;
}

function presentOne(
  option: OemShaftOptionAssessment,
  requirements: NormalisedRequirements,
  isPrimary: boolean
): PresentedShaftOption {
  return {
    shaftKey: option.shaft_key,
    title: shaftTitle(option),
    flexLabel: option.flex_label,
    weightLabel: weightLabel(option),
    launchLabel: launchPlain(option.launch_profile),
    why: whyFits(option, requirements),
    isPrimary,
  };
}

/**
 * Consumer presentation for Checkpoint C shaft options.
 * Never claims a verified complete-driver configuration or stock availability.
 */
export function presentShaftOptionsSection(input: {
  options: readonly OemShaftOptionAssessment[];
  requirements: NormalisedRequirements;
  /** When true, card omits generic guidance (shown once on the page). */
  pageHasSharedShaftGuidance: boolean;
}): PresentedShaftOptionsSection {
  const { options, requirements, pageHasSharedShaftGuidance } = input;
  const suggestedLoftLabel =
    requirements.preferred_loft_min_deg != null &&
    requirements.preferred_loft_max_deg != null
      ? `Suggested loft territory: about ${requirements.preferred_loft_min_deg}°–${requirements.preferred_loft_max_deg}° (confirm on a real club; not a verified build).`
      : null;

  if (options.length === 0) {
    return {
      mode: "none",
      heading: pageHasSharedShaftGuidance
        ? "Shaft"
        : "What to look for in a shaft",
      offeringNote: null,
      primary: null,
      alternatives: [],
      differenceNote: null,
      suggestedLoftLabel,
    };
  }

  const primary = presentOne(options[0], requirements, true);
  const alternatives = options
    .slice(1)
    .map((option) => presentOne(option, requirements, false));
  return {
    mode: "named",
    heading: "Shafts worth considering",
    offeringNote: OEM_SHAFT_OFFERING_NOTE,
    primary,
    alternatives,
    differenceNote:
      options.length > 1 ? differenceNote(options[0], options[1]) : null,
    suggestedLoftLabel,
  };
}
