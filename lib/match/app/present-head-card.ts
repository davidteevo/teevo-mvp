import type {
  CatalogueHeadExplanation,
  CatalogueHeadScore,
} from "../catalogue-types";
import type { Band, NormalisedRequirements } from "../types";
import {
  CATALOGUE_HEAD_REASON,
  type CatalogueHeadReasonCode,
} from "./explain";

/**
 * Plain-English labels for the Band enum the engine returns.
 * EXCELLENT_MATCH is "Strong head fit" because the engine's own phrase is
 * "strong suitability", and "Excellent Match" would read as a complete club.
 */
export const HEAD_SUITABILITY_BAND_LABEL: Record<Band, string> = {
  EXCELLENT_MATCH: "Strong head fit",
  VERY_GOOD_MATCH: "Very good head fit",
  GOOD_MATCH: "Good head fit",
  DO_NOT_ACTIVELY_RECOMMEND: "Not actively recommended",
};

const PLAIN_REASON: Record<CatalogueHeadReasonCode, string> = {
  FORGIVENESS: "Forgiveness looks consistent with what you told us.",
  STABILITY: "Stability looks consistent with what you told us.",
  WORKABILITY: "The amount of shot shaping looks consistent with what you prefer.",
  DIRECTION:
    "This head's usual shot shape looks consistent with the start and curve you described. That does not guarantee your ball flight.",
  LAUNCH:
    "This head's usual launch looks consistent with the flight you described. The loft you play still matters.",
};

const KNOWN_CONFLICT_COPY: Record<string, string> = {
  DIRECTION_INPUT_CONFLICT:
    "Your answers about shot shape do not agree, so this suggestion is less certain.",
  LAUNCH_INPUT_CONFLICT:
    "Your answers about launch do not agree, so this suggestion is less certain.",
  SPEED_CARRY_CONFLICT:
    "Your swing speed and carry distance do not agree, so this suggestion is less certain.",
  LOFT_EVIDENCE_CONFLICT:
    "Your answers about loft do not agree, so this suggestion is less certain.",
};

const CONFLICT_PRIORITY = [
  "DIRECTION_INPUT_CONFLICT",
  "LAUNCH_INPUT_CONFLICT",
  "SPEED_CARRY_CONFLICT",
  "LOFT_EVIDENCE_CONFLICT",
] as const;

const REASON_CODE_BY_TEXT = new Map<string, CatalogueHeadReasonCode>(
  (Object.keys(CATALOGUE_HEAD_REASON) as CatalogueHeadReasonCode[]).map((code) => [
    CATALOGUE_HEAD_REASON[code],
    code,
  ])
);

export type HeadCardReason = {
  source: "recognised" | "summary";
  code: CatalogueHeadReasonCode | null;
  text: string;
};

export type HeadCardCaveatKind =
  | "FORGIVENESS_EVIDENCE"
  | "DIRECTION_EVIDENCE"
  | "LAUNCH_EVIDENCE"
  | "WORKABILITY_COMPROMISE"
  | "INPUT_CONFLICT"
  | "INCOMPLETE_COVERAGE"
  | "MEDIUM_CONFIDENCE";

export type HeadCardCaveat = {
  kind: HeadCardCaveatKind;
  text: string;
};

export type PresentedHeadCard = {
  catalogueKey: string;
  title: string;
  bandLabel: string | null;
  reason: HeadCardReason | null;
  caveat: HeadCardCaveat | null;
  details: {
    otherCaveats: string[];
    otherReasons: string[];
    tradeOffs: string[];
    uncertainty: string[];
    coverageLabel: string | null;
    releaseYearLabel: string | null;
  };
};

export function headSuitabilityBandLabel(band: Band | null | undefined): string | null {
  if (!band) return null;
  return HEAD_SUITABILITY_BAND_LABEL[band] ?? null;
}

export function namedHeadsScoredEqually(recommendations: CatalogueHeadScore[]): boolean {
  return recommendations.some((a, i) =>
    recommendations.slice(i + 1).some(
      (b) =>
        a.catalogue_match_band === b.catalogue_match_band &&
        a.catalogue_fit_score === b.catalogue_fit_score
    )
  );
}

export const EQUAL_HEAD_SCORE_MESSAGE =
  "These driver heads scored equally on the characteristics we assessed.";

function headTitle(score: CatalogueHeadScore): string {
  const displayName = score.display_name?.trim();
  if (displayName) return displayName;
  const fromParts = [score.brand, score.model].filter(Boolean).join(" ");
  if (fromParts) return fromParts;
  return "Driver head";
}

function recognisedReason(explanation: CatalogueHeadExplanation | undefined, score: CatalogueHeadScore): HeadCardReason | null {
  if (!explanation || explanation.catalogue_key !== score.catalogue_key) return null;
  for (const line of explanation.reasons) {
    const code = REASON_CODE_BY_TEXT.get(line);
    if (code) {
      return { source: "recognised", code, text: PLAIN_REASON[code] };
    }
  }
  const summary = explanation.suitability_summary?.trim();
  if (summary) return { source: "summary", code: null, text: summary };
  return null;
}

function conflictCodes(score: CatalogueHeadScore): string[] {
  const present = new Set(
    score.considerations.filter((code) => code.endsWith("_CONFLICT"))
  );
  const ordered: string[] = [];
  for (const code of CONFLICT_PRIORITY) {
    if (present.has(code)) ordered.push(code);
  }
  const rest = Array.from(present)
    .filter((code) => !CONFLICT_PRIORITY.includes(code as (typeof CONFLICT_PRIORITY)[number]))
    .sort();
  return [...ordered, ...rest];
}

function conflictSentence(code: string): string {
  return (
    KNOWN_CONFLICT_COPY[code] ??
    "Some of your answers conflict, so this suggestion is less certain."
  );
}

/**
 * One principal caveat, then the rest. Conditions match the evidence
 * explainCatalogueHead already records. Nothing here is a new score.
 */
function caveatsFor(
  score: CatalogueHeadScore,
  requirements: NormalisedRequirements
): HeadCardCaveat[] {
  const dims = score.dimensions;
  const caveats: HeadCardCaveat[] = [];

  if (!dims.forgiveness?.active && requirements.forgiveness_requirement != null) {
    caveats.push({
      kind: "FORGIVENESS_EVIDENCE",
      text: "We could not fully check forgiveness for this head.",
    });
  }
  if (!dims.direction?.active && requirements.directional_target_numeric != null) {
    caveats.push({
      kind: "DIRECTION_EVIDENCE",
      text: "We could not fully check the shot shape you described for this head.",
    });
  }
  if (
    !dims.head_launch?.active &&
    requirements.head_launch_target !== "UNRESOLVED" &&
    requirements.head_launch_target_numeric != null
  ) {
    caveats.push({
      kind: "LAUNCH_EVIDENCE",
      text: "We could not fully check the launch you described for this head.",
    });
  }
  if (dims.workability?.active && (dims.workability.score ?? 100) < 85) {
    caveats.push({
      kind: "WORKABILITY_COMPROMISE",
      text: "Shot shaping looks like a compromise for this head.",
    });
  }
  for (const code of conflictCodes(score)) {
    caveats.push({ kind: "INPUT_CONFLICT", text: conflictSentence(code) });
  }
  if (score.active_catalogue_dim_count < 5) {
    caveats.push({
      kind: "INCOMPLETE_COVERAGE",
      text: "We could only check some of the usual head traits, so treat this as a guide.",
    });
  }
  if (score.head_recommendation_confidence === "MEDIUM") {
    caveats.push({
      kind: "MEDIUM_CONFIDENCE",
      text: "This suggestion is less certain from the answers so far.",
    });
  }
  return caveats;
}

function otherPlainReasons(
  explanation: CatalogueHeadExplanation | undefined,
  score: CatalogueHeadScore,
  primary: HeadCardReason | null
): string[] {
  if (!explanation || explanation.catalogue_key !== score.catalogue_key) return [];
  const lines: string[] = [];
  for (const line of explanation.reasons) {
    const code = REASON_CODE_BY_TEXT.get(line);
    if (!code) continue;
    if (primary?.source === "recognised" && primary.code === code) continue;
    lines.push(PLAIN_REASON[code]);
  }
  return lines;
}

export function presentHeadCard(
  score: CatalogueHeadScore,
  explanation: CatalogueHeadExplanation | undefined,
  requirements: NormalisedRequirements
): PresentedHeadCard {
  const [caveat, ...otherCaveats] = caveatsFor(score, requirements);
  const reason = recognisedReason(explanation, score);
  const aligned =
    explanation && explanation.catalogue_key === score.catalogue_key ? explanation : undefined;
  const year = score.release_year;
  const coverage =
    Number.isFinite(score.active_catalogue_dim_count)
      ? `Checked ${score.active_catalogue_dim_count} of 5 head traits.`
      : null;

  return {
    catalogueKey: score.catalogue_key,
    title: headTitle(score),
    bandLabel: headSuitabilityBandLabel(score.catalogue_match_band),
    reason,
    caveat: caveat ?? null,
    details: {
      otherCaveats: otherCaveats.map((item) => item.text),
      otherReasons: otherPlainReasons(explanation, score, reason),
      tradeOffs: aligned?.trade_offs ?? [],
      uncertainty: aligned?.uncertainty ?? [],
      coverageLabel: coverage,
      releaseYearLabel:
        year != null && Number.isFinite(year) ? `Released in ${year}.` : null,
    },
  };
}

export function presentNamedHeadCards(
  recommendations: CatalogueHeadScore[],
  explanations: CatalogueHeadExplanation[],
  requirements: NormalisedRequirements
): PresentedHeadCard[] {
  return recommendations.map((score, index) =>
    presentHeadCard(score, explanations[index], requirements)
  );
}
