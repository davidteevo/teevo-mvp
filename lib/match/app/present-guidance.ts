import type {
  CatalogueRecommendationMode,
  CharacteristicGuidance,
  ShaftGuidance,
} from "../catalogue-types";

/**
 * Plain-English guidance for when Teevo cannot name a driver head.
 * Reads the existing result. Does not score or invent heads.
 */
export type GuidancePresentation = {
  title: string;
  reason: string;
  characteristics: string[];
  limitation: string;
  details: string[];
};

const RESOLVED_LAUNCH = new Set([
  "LOW",
  "MID_LOW",
  "MID",
  "MID_HIGH",
  "HIGH",
]);

const SHOT_SHAPE = new Set([
  "DRAW_ASSIST",
  "STRONG_DRAW_ASSIST",
  "FADE_ASSIST",
  "STRONG_FADE_ASSIST",
]);

export const PATHWAY_C_SPEED_REPLACES_CARRY =
  "We'll use the swing speed you entered instead of your earlier carry distance. This is not recorded as a measured speed.";

export const UNRANKED_EXAMPLE_NOTE =
  "These examples passed the same UK and family checks and sit in the top suitability band. The order is catalogue order, not a personal ranking. None of these is labelled a Best Match.";

/** True only when a saved carry distance would be replaced by a new swing speed. */
export function pathwayCReplacesCarry(carry: string, speedDraft: string): boolean {
  return carry.trim() !== "" && speedDraft.trim() !== "";
}

function reasonFor(
  mode: CatalogueRecommendationMode,
  insufficientEvidenceReason: string | null
): string {
  if (mode === "NO_DEFENSIBLE_HEADS") {
    return "Teevo could not find a driver it can recommend from these answers. That is a limit of the evidence, not a mistake in what you told us.";
  }
  if (insufficientEvidenceReason === "NO_MEANINGFUL_HEAD_DIFFERENTIATION") {
    return "Based on what you've told us, we can't confidently pick one as your best match yet.";
  }
  if (insufficientEvidenceReason === "INSUFFICIENT_EVIDENCE_BACKED_REQUIREMENT_DIMS") {
    return "Teevo needs a little more about your game before it can name a driver.";
  }
  return "Teevo cannot confidently name a driver from these answers yet.";
}

function characteristicsFor(guidance: CharacteristicGuidance): string[] {
  const lines: string[] = [];
  const forgiveness = guidance.forgiveness_requirement;
  const workability = guidance.workability_preference;
  const stability = guidance.stability_requirement;
  const balanced =
    forgiveness != null &&
    workability != null &&
    forgiveness >= 3 &&
    workability >= 3 &&
    Math.abs(forgiveness - workability) <= 1;

  if (balanced) {
    lines.push("A suitable balance between forgiveness and shot shaping.");
  } else if (forgiveness != null && forgiveness >= 4) {
    lines.push("More forgiving on off-centre strikes.");
  } else if (stability != null && stability >= 4) {
    lines.push("A stable head for the consistency you described.");
  }

  if (RESOLVED_LAUNCH.has(guidance.head_launch_target)) {
    lines.push("A head with characteristics suited to the ball flight you described.");
  }
  if (SHOT_SHAPE.has(guidance.directional_requirement)) {
    lines.push("A head with characteristics suited to the shot shape you described.");
  }
  return lines.slice(0, 3);
}

function detailsFor(
  guidance: CharacteristicGuidance,
  shaft: ShaftGuidance
): string[] {
  const lines = [...guidance.notes];
  if (
    guidance.preferred_loft_min_deg != null &&
    guidance.preferred_loft_max_deg != null
  ) {
    lines.push(
      `Preferred loft territory: about ${guidance.preferred_loft_min_deg}°–${guidance.preferred_loft_max_deg}°. Confirm this on an actual club.`
    );
  }
  if (shaft.available) {
    if (shaft.flex_label) lines.push(shaft.flex_label);
    if (shaft.weight_label) lines.push(shaft.weight_label);
    if (shaft.launch_label) lines.push(shaft.launch_label);
  }
  for (const note of shaft.notes) {
    if (!lines.includes(note)) lines.push(note);
  }
  return lines;
}

export function presentCharacteristicGuidance(input: {
  mode: CatalogueRecommendationMode;
  insufficientEvidenceReason: string | null;
  guidance: CharacteristicGuidance;
  shaft: ShaftGuidance;
}): GuidancePresentation {
  const tied =
    input.insufficientEvidenceReason === "NO_MEANINGFUL_HEAD_DIFFERENTIATION";
  return {
    title: tied
      ? "Several drivers could suit your game."
      : "Let's narrow down your driver",
    reason: reasonFor(input.mode, input.insufficientEvidenceReason),
    characteristics: characteristicsFor(input.guidance),
    limitation:
      "This looks at the driver head only. Shaft, loft and the exact club for sale are not included.",
    details: detailsFor(input.guidance, input.shaft),
  };
}
