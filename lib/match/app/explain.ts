import type {
  CatalogueHeadExplanation,
  CatalogueHeadScore,
  CharacteristicGuidance,
} from "../catalogue-types";
import type { NormalisedRequirements } from "../types";

function bandPhrase(band: string | null | undefined): string {
  switch (band) {
    case "EXCELLENT_MATCH":
      return "strong model-level suitability";
    case "VERY_GOOD_MATCH":
      return "very good model-level suitability";
    case "GOOD_MATCH":
      return "good model-level suitability";
    default:
      return "limited model-level suitability";
  }
}

/**
 * Map active catalogue dimensions to plain-language reasons.
 * Only claims supported by active traces / requirements. Qualified language.
 */
export function explainCatalogueHead(
  score: CatalogueHeadScore,
  req: NormalisedRequirements
): CatalogueHeadExplanation {
  const reasons: string[] = [];
  const trade_offs: string[] = [];
  const uncertainty: string[] = [];
  const dims = score.dimensions;

  if (dims.forgiveness?.active) {
    reasons.push(
      "Forgiveness characteristic is consistent with the support level suggested by your inputs (model-level only)."
    );
  } else if (req.forgiveness_requirement != null) {
    uncertainty.push("Forgiveness evidence for this head is incomplete.");
  }

  if (dims.stability?.active) {
    reasons.push(
      "Stability characteristic is consistent with the consistency needs indicated (model-level only)."
    );
  }

  if (dims.workability?.active) {
    if ((dims.workability.score ?? 100) < 85) {
      trade_offs.push(
        "Workability may be a compromise relative to forgiveness-oriented needs."
      );
    } else {
      reasons.push(
        "Workability characteristic is consistent with your stated preference (model-level only)."
      );
    }
  }

  if (dims.direction?.active) {
    reasons.push(
      "Published directional bias is consistent with the start/curve pattern you described — not a guarantee of shot shape."
    );
  } else if (req.directional_target_numeric != null) {
    uncertainty.push("Directional bias evidence is incomplete for this head.");
  } else {
    uncertainty.push(
      "Directional preference was unresolved — direction did not contribute to this catalogue Fit."
    );
  }

  if (dims.head_launch?.active) {
    reasons.push(
      "Published launch tendency is consistent with your flight preference — loft on a real club still matters."
    );
  } else if (
    req.head_launch_target !== "UNRESOLVED" &&
    req.head_launch_target_numeric != null
  ) {
    uncertainty.push("Launch tendency evidence is incomplete for this head.");
  } else {
    uncertainty.push(
      "Head launch preference was unresolved — launch did not contribute to this catalogue Fit."
    );
  }

  trade_offs.push(
    "Model-level suitability only — not proof that a specific loft, shaft or handedness exists in stock."
  );
  trade_offs.push(
    "Catalogue Fit does not score loft or shaft. Preferred loft and shaft profile are guidance only."
  );

  if (score.active_catalogue_dim_count < 5) {
    uncertainty.push(
      `Only ${score.active_catalogue_dim_count} of 5 characteristic dimensions were active — treat this ranking cautiously.`
    );
  }

  if (score.head_recommendation_confidence === "MEDIUM") {
    uncertainty.push(
      "Presentation confidence is medium — answers or equipment evidence leave uncertainty."
    );
  }
  for (const c of score.considerations) {
    if (c.endsWith("_CONFLICT")) {
      uncertainty.push(
        `Input conflict noted: ${c.replace(/_/g, " ").toLowerCase()}.`
      );
    }
  }

  const name =
    score.display_name ||
    [score.brand, score.model].filter(Boolean).join(" ") ||
    score.catalogue_key;

  return {
    catalogue_key: score.catalogue_key,
    suitability_summary: `${name} shows ${bandPhrase(score.catalogue_match_band)} on catalogue characteristics for your described game. This is an equipment recommendation, not a purchase offer, and loft/shaft were not scored.`,
    reasons: reasons.slice(0, 4),
    trade_offs: trade_offs.slice(0, 4),
    uncertainty: uncertainty.slice(0, 4),
  };
}

export function buildCharacteristicGuidance(
  req: NormalisedRequirements
): CharacteristicGuidance {
  const notes: string[] = [
    "Named head rankings need enough independent head-fit evidence and meaningful Fit differentiation. Below are target characteristics derived from your answers.",
    "Handedness filters purchasable listings later; catalogue models are not handedness-specific suitability claims.",
    "Loft and shaft are not scored at catalogue level — confirm configuration on real inventory.",
  ];
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
