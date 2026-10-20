import type {
  CatalogueHeadExplanation,
  CatalogueHeadScore,
  CharacteristicGuidance,
} from "../catalogue-types";
import type { NormalisedRequirements } from "../types";

function bandPhrase(band: string | null | undefined): string {
  switch (band) {
    case "EXCELLENT_MATCH":
      return "strong suitability on assessed head characteristics";
    case "VERY_GOOD_MATCH":
      return "very good suitability on assessed head characteristics";
    case "GOOD_MATCH":
      return "good suitability on assessed head characteristics";
    default:
      return "limited suitability on assessed head characteristics";
  }
}

/**
 * Reason sentences explainCatalogueHead actually emits.
 * Presentation matches these with exact equality. It does not search inside them.
 */
export const CATALOGUE_HEAD_REASON = {
  FORGIVENESS:
    "Forgiveness characteristic is consistent with the support level suggested by your inputs (model-level only).",
  STABILITY:
    "Stability characteristic is consistent with the consistency needs indicated (model-level only).",
  WORKABILITY:
    "Workability characteristic is consistent with your stated preference (model-level only).",
  DIRECTION:
    "Published directional bias is consistent with the start/curve pattern you described — not a guarantee of shot shape.",
  LAUNCH:
    "Published launch tendency is consistent with your flight preference — loft on a real club still matters.",
} as const;

export type CatalogueHeadReasonCode = keyof typeof CATALOGUE_HEAD_REASON;

export type ExplainCatalogueOptions = {
  /** True when returned named cards share the same band + exact Fit. */
  equalFitAmongNamed?: boolean;
};

export type CharacteristicGuidanceOptions = {
  differentiationBlocked?: boolean;
  topTiedFamilyCount?: number;
  topTiedMinActiveDims?: number;
};

function pinUncertainty(lines: string[], pinned: string[], rest: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of [...pinned, ...rest, ...lines]) {
    if (!line || seen.has(line)) continue;
    seen.add(line);
    out.push(line);
  }
  return out;
}

/**
 * Map active catalogue dimensions to plain-language reasons.
 * Only claims supported by active traces / requirements. Qualified language.
 */
export function explainCatalogueHead(
  score: CatalogueHeadScore,
  req: NormalisedRequirements,
  options: ExplainCatalogueOptions = {}
): CatalogueHeadExplanation {
  const reasons: string[] = [];
  const trade_offs: string[] = [];
  const pinnedUncertainty: string[] = [];
  const restUncertainty: string[] = [];
  const dims = score.dimensions;

  if (dims.forgiveness?.active) {
    reasons.push(CATALOGUE_HEAD_REASON.FORGIVENESS);
  } else if (req.forgiveness_requirement != null) {
    pinnedUncertainty.push("Forgiveness evidence for this head is incomplete.");
  }

  if (dims.stability?.active) {
    reasons.push(CATALOGUE_HEAD_REASON.STABILITY);
  }

  if (dims.workability?.active) {
    if ((dims.workability.score ?? 100) < 85) {
      trade_offs.push(
        "Workability may be a compromise relative to forgiveness-oriented needs."
      );
    } else {
      reasons.push(CATALOGUE_HEAD_REASON.WORKABILITY);
    }
  }

  if (dims.direction?.active) {
    reasons.push(CATALOGUE_HEAD_REASON.DIRECTION);
  } else if (req.directional_target_numeric != null) {
    pinnedUncertainty.push(
      "Directional bias evidence is incomplete for this head."
    );
  } else {
    restUncertainty.push(
      "Directional preference was unresolved — direction did not contribute to this catalogue Fit."
    );
  }

  if (dims.head_launch?.active) {
    reasons.push(CATALOGUE_HEAD_REASON.LAUNCH);
  } else if (
    req.head_launch_target !== "UNRESOLVED" &&
    req.head_launch_target_numeric != null
  ) {
    pinnedUncertainty.push(
      "Launch tendency evidence is incomplete for this head — launch was not scored for this model."
    );
  } else {
    restUncertainty.push(
      "Head launch preference was unresolved — launch did not contribute to this catalogue Fit."
    );
  }

  trade_offs.push(
    "Model-level suitability only — not proof that a specific loft, shaft or handedness exists in stock."
  );
  trade_offs.push(
    "Catalogue Fit does not score loft or shaft. Preferred loft and shaft profile are guidance only."
  );
  trade_offs.push(
    "UK-market presence is not proof of live Teevo inventory or a purchasable configuration."
  );

  if (score.active_catalogue_dim_count < 5) {
    pinnedUncertainty.unshift(
      `Only ${score.active_catalogue_dim_count} of 5 head characteristics were assessed — this is not a complete custom club fitting.`
    );
  }

  if (options.equalFitAmongNamed) {
    pinnedUncertainty.unshift(
      "These clubs have similar Fit scores on the available characteristics. List order is not a stronger technical Fit. Shaft and loft are not included in catalogue scoring."
    );
  }

  if (score.head_recommendation_confidence === "MEDIUM") {
    restUncertainty.push(
      "Presentation confidence is medium — answers or equipment evidence leave uncertainty."
    );
  }
  for (const c of score.considerations) {
    if (c.endsWith("_CONFLICT")) {
      restUncertainty.push(
        `Input conflict noted: ${c.replace(/_/g, " ").toLowerCase()}.`
      );
    }
  }

  const name =
    score.display_name ||
    [score.brand, score.model].filter(Boolean).join(" ") ||
    score.catalogue_key;

  const coverageNote =
    score.active_catalogue_dim_count < 5
      ? ` Assessed on ${score.active_catalogue_dim_count} of 5 head characteristics.`
      : " Assessed on all 5 head characteristics available to catalogue Fit.";

  const suitability_summary = options.equalFitAmongNamed
    ? `${name} shows ${bandPhrase(score.catalogue_match_band)}.${coverageNote} Similar Fit to the other named options here — order is presentation only, not a better technical Fit. This is model-level equipment guidance, not a purchase offer and not a complete custom club fitting; loft/shaft were not scored.`
    : `${name} shows ${bandPhrase(score.catalogue_match_band)}.${coverageNote} This is model-level equipment guidance, not a purchase offer and not a complete custom club fitting; loft/shaft were not scored.`;

  const uncertainty = pinUncertainty([], pinnedUncertainty, restUncertainty);

  return {
    catalogue_key: score.catalogue_key,
    suitability_summary,
    reasons: reasons.slice(0, 4),
    trade_offs: trade_offs.slice(0, 4),
    // Keep pinned missing-evidence lines; allow a slightly higher cap so they are not dropped.
    uncertainty: uncertainty.slice(0, 6),
  };
}

export function buildCharacteristicGuidance(
  req: NormalisedRequirements,
  options: CharacteristicGuidanceOptions = {}
): CharacteristicGuidance {
  const notes: string[] = [
    "Named head rankings need enough independent head-fit evidence and meaningful Fit differentiation. Below are target characteristics derived from your answers.",
    "Handedness filters purchasable listings later; catalogue models are not handedness-specific suitability claims.",
    "Loft and shaft are not scored at catalogue level — confirm configuration on real inventory.",
  ];

  if (options.differentiationBlocked) {
    const tied = options.topTiedFamilyCount ?? 0;
    const minDims = options.topTiedMinActiveDims ?? 0;
    notes.unshift(
      tied > 0
        ? `Teevo cannot confidently distinguish the leading heads: about ${tied} UK-eligible families share the top Fit tier with incomplete characteristic coverage (as few as ${minDims} of 5 assessed). Named rankings are withheld rather than guessing.`
        : "Teevo cannot confidently distinguish the leading heads on the available characteristic evidence. Named rankings are withheld rather than guessing."
    );
    const directionUnresolved = req.directional_target_numeric == null;
    if (directionUnresolved) {
      notes.push(
        "Adding typical start direction, typical curve, or a miss-reduction goal (reduce right/left misses) often unlocks clearer differentiation — these fields are already on the questionnaire."
      );
    }
  }

  if (req.preferred_loft_min_deg != null && req.preferred_loft_max_deg != null) {
    notes.push(
      `Preferred loft territory: about ${req.preferred_loft_min_deg}°–${req.preferred_loft_max_deg}° (confirm on an actual club).`
    );
  } else {
    notes.push(
      "Loft territory is unresolved — add swing speed or a known current loft to refine."
    );
  }

  return {
    handedness: req.handedness,
    preferred_loft_min_deg: req.preferred_loft_min_deg,
    preferred_loft_max_deg: req.preferred_loft_max_deg,
    shaft_flex_min_value: req.shaft_flex_min_value,
    shaft_flex_max_value: req.shaft_flex_max_value,
    shaft_weight_min_g: req.shaft_weight_min_g,
    shaft_weight_max_g: req.shaft_weight_max_g,
    shaft_launch_target: req.shaft_launch_target,
    head_launch_target: req.head_launch_target,
    directional_requirement: req.directional_requirement,
    forgiveness_requirement: req.forgiveness_requirement,
    stability_requirement: req.stability_requirement,
    workability_preference: req.workability_preference,
    notes,
  };
}
