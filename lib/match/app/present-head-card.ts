import type {
  CatalogueHeadExplanation,
  CatalogueHeadScore,
} from "../catalogue-types";
import { BAND_RANK } from "../bands";
import type { Band, ConfidenceBand, NormalisedRequirements } from "../types";
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
  source: "recognised" | "summary" | "comparison" | "profile" | "benefit";
  code: CatalogueHeadReasonCode | null;
  text: string;
};

export type HeadCardBenefit = {
  code: CatalogueHeadReasonCode | "PROFILE";
  text: string;
};

/** Catalogue role. Commercial listing labels are assigned separately. */
export type HeadCardRole = "BEST_SUPPORTED" | "ALTERNATIVE" | "SIMILAR";

export const HEAD_CARD_ROLE_LABEL: Record<HeadCardRole, string | null> = {
  BEST_SUPPORTED: "Top Head Match",
  ALTERNATIVE: "Alternative Head Match",
  SIMILAR: "Similarly Suitable",
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
  /** Head-suitability role. Null when this card is shown on its own. */
  role: HeadCardRole | null;
  roleLabel: string | null;
  bandLabel: string | null;
  confidenceLabel: string | null;
  /** Face line, distinct from the details coverage sentence. */
  assessedLabel: string | null;
  /** Short benefit line. Null when no golfer answer supports one. */
  headline: string | null;
  /** Up to two evidence-backed highlights. Empty when they would be identical. */
  benefits: HeadCardBenefit[];
  /** Model year for the face. The details sentence stays separate. */
  releaseYear: number | null;
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

export function headEvidenceConfidenceLabel(
  confidence: ConfidenceBand | null | undefined
): string | null {
  if (confidence === "HIGH") return "High evidence confidence";
  if (confidence === "MEDIUM") return "Medium evidence confidence";
  if (confidence === "LOW") return "Low evidence confidence";
  return null;
}

const COMPARED_DIMENSIONS: Array<{
  key: "forgiveness" | "stability" | "workability" | "direction" | "head_launch";
  noun: string;
  code: CatalogueHeadReasonCode;
}> = [
  { key: "forgiveness", noun: "Forgiveness", code: "FORGIVENESS" },
  { key: "stability", noun: "Stability", code: "STABILITY" },
  { key: "workability", noun: "Shot shaping", code: "WORKABILITY" },
  { key: "direction", noun: "Shot shape", code: "DIRECTION" },
  { key: "head_launch", noun: "Launch", code: "LAUNCH" },
];

const KNOWN_HEAD_PROFILE: Record<string, string> = {
  MAX_FORGIVENESS: "a high-forgiveness profile",
  STANDARD: "a standard profile",
  LOW_SPIN: "a low-spin profile",
  DRAW_BIASED: "a draw-biased profile",
  PLAYERS: "a players profile",
  HIGH_LAUNCH: "a high-launch profile",
};

const KNOWN_DIRECTIONAL_BIAS: Record<string, string> = {
  NEUTRAL: "neutral",
  FADE: "a fade",
  STRONG_FADE: "a strong fade",
  DRAW: "a draw",
  STRONG_DRAW: "a strong draw",
};

function activeDimensionScore(score: CatalogueHeadScore, key: string): number | null {
  const trace = score.dimensions[key];
  if (!trace?.active || trace.score == null || !Number.isFinite(trace.score)) return null;
  return trace.score;
}

function sameFitTier(a: CatalogueHeadScore, b: CatalogueHeadScore): boolean {
  if (a.catalogue_match_band == null || b.catalogue_match_band == null) return false;
  if (a.catalogue_fit_score == null || b.catalogue_fit_score == null) return false;
  return (
    a.catalogue_match_band === b.catalogue_match_band &&
    a.catalogue_fit_score === b.catalogue_fit_score
  );
}

function strictlyBetterHead(a: CatalogueHeadScore, b: CatalogueHeadScore): boolean {
  if (sameFitTier(a, b)) return false;
  if (a.catalogue_match_band == null || b.catalogue_match_band == null) return false;
  const bandGap = BAND_RANK[a.catalogue_match_band] - BAND_RANK[b.catalogue_match_band];
  if (bandGap !== 0) return bandGap > 0;
  return (a.catalogue_fit_score ?? 0) > (b.catalogue_fit_score ?? 0);
}

export function headCardRole(
  score: CatalogueHeadScore,
  peers: CatalogueHeadScore[]
): HeadCardRole | null {
  const others = peers.filter((peer) => peer.catalogue_key !== score.catalogue_key);
  if (others.length === 0) return null;
  const tied = others.some((peer) => sameFitTier(score, peer));
  const beaten = others.some((peer) => strictlyBetterHead(peer, score));
  if (!beaten && !tied) return "BEST_SUPPORTED";
  if (!beaten && tied) return "SIMILAR";
  return "ALTERNATIVE";
}

function comparisonReason(
  score: CatalogueHeadScore,
  peers: CatalogueHeadScore[]
): HeadCardReason | null {
  const others = peers.filter((peer) => peer.catalogue_key !== score.catalogue_key);
  if (others.length === 0) return null;

  let chosen: { order: number; gap: number; reason: HeadCardReason } | null = null;
  for (let order = 0; order < COMPARED_DIMENSIONS.length; order += 1) {
    const dimension = COMPARED_DIMENSIONS[order];
    const mine = activeDimensionScore(score, dimension.key);
    if (mine == null) continue;
    const peerScores = others
      .map((peer) => activeDimensionScore(peer, dimension.key))
      .filter((value): value is number => value != null);
    if (peerScores.length === 0) continue;
    const diffs = peerScores.map((peerScore) => mine - peerScore);
    if (diffs.every((diff) => diff === 0)) continue;
    const gap = Math.max(...diffs.map((diff) => Math.abs(diff)));
    if (chosen && (gap < chosen.gap || (gap === chosen.gap && order > chosen.order))) continue;
    const higher = diffs.some((diff) => diff > 0) && diffs.every((diff) => diff >= 0);
    const lower = diffs.some((diff) => diff < 0) && diffs.every((diff) => diff <= 0);
    const text = higher
      ? `${dimension.noun} scores higher on this head than on ${diffs.every((diff) => diff > 0) ? "the other recommended heads" : "another recommended head"}.`
      : lower
        ? `${dimension.noun} scores lower on this head than on ${diffs.every((diff) => diff < 0) ? "the other recommended heads" : "another recommended head"}.`
        : `${dimension.noun} sits between the other recommended heads on the assessed characteristic.`;
    chosen = {
      order,
      gap,
      reason: { source: "comparison", code: dimension.code, text },
    };
  }
  return chosen?.reason ?? null;
}

function recordedProfilePhrase(score: CatalogueHeadScore): string | null {
  const chars = score.presentation_chars;
  if (!chars) return null;
  const profile = chars.primary_head_profile
    ? KNOWN_HEAD_PROFILE[chars.primary_head_profile]
    : null;
  if (profile) return `This head is recorded as ${profile}.`;
  const bias = chars.directional_bias
    ? KNOWN_DIRECTIONAL_BIAS[chars.directional_bias]
    : null;
  if (bias) return `This head is recorded with ${bias} directional bias.`;
  return null;
}

function profileReason(
  score: CatalogueHeadScore,
  peers: CatalogueHeadScore[]
): HeadCardReason | null {
  const mine = recordedProfilePhrase(score);
  if (!mine) return null;
  const others = peers.filter((peer) => peer.catalogue_key !== score.catalogue_key);
  if (!others.every((peer) => sameFitTier(score, peer))) return null;
  const differs = others.some((peer) => recordedProfilePhrase(peer) !== mine);
  if (!differs) return null;
  return {
    source: "profile",
    code: null,
    text: `${mine} The Fit score is shared, so this description is not a ranking.`,
  };
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

const BENEFIT_HEADLINE: Record<CatalogueHeadReasonCode, string> = {
  FORGIVENESS: "A strong option if forgiveness is your priority.",
  STABILITY: "A steady option if consistency matters to you.",
  WORKABILITY: "Worth considering if you like to shape shots.",
  DIRECTION: "Worth considering for the shot shape you described.",
  LAUNCH: "Worth considering for the flight you described.",
};

const BENEFIT_OPENING: Record<CatalogueHeadReasonCode, string> = {
  FORGIVENESS: "Your answers suggest forgiveness matters for your game.",
  STABILITY: "Your answers suggest a stable head matters for your game.",
  WORKABILITY: "Your answers suggest you want a head you can shape.",
  DIRECTION: "Your answers suggest the shot shape you described matters.",
  LAUNCH: "Your answers suggest the flight you described matters.",
};

const BENEFIT_NOUN: Record<CatalogueHeadReasonCode, string> = {
  FORGIVENESS: "forgiveness",
  STABILITY: "stability",
  WORKABILITY: "shot shaping",
  DIRECTION: "shot shape",
  LAUNCH: "launch",
};

const BENEFIT_CHIP: Record<CatalogueHeadReasonCode, string> = {
  FORGIVENESS: "Forgiving for your game",
  STABILITY: "Stability-focused design",
  WORKABILITY: "Supports shot shaping",
  DIRECTION: "Matches your shot shape",
  LAUNCH: "Suits your preferred flight",
};

const HEDGED_HEADLINE = "Worth considering, with some evidence still open.";

const PROFILE_CHIP: Record<string, string> = {
  MAX_FORGIVENESS: "Recorded high-forgiveness profile",
  STANDARD: "Recorded standard profile",
  LOW_SPIN: "Recorded low-spin profile",
  DRAW_BIASED: "Recorded draw-biased profile",
  PLAYERS: "Recorded players profile",
  HIGH_LAUNCH: "Recorded high-launch profile",
};

function golferAsked(
  requirements: NormalisedRequirements,
  key: (typeof COMPARED_DIMENSIONS)[number]["key"]
): boolean {
  switch (key) {
    case "forgiveness":
      return requirements.forgiveness_requirement != null;
    case "stability":
      return requirements.stability_requirement != null;
    case "workability":
      return requirements.workability_preference != null;
    case "direction":
      return requirements.directional_target_numeric != null;
    case "head_launch":
      return (
        requirements.head_launch_target !== "UNRESOLVED" &&
        requirements.head_launch_target_numeric != null
      );
    default:
      return false;
  }
}

function dimensionDiffs(
  score: CatalogueHeadScore,
  peers: CatalogueHeadScore[],
  key: (typeof COMPARED_DIMENSIONS)[number]["key"]
): number[] {
  const mine = activeDimensionScore(score, key);
  if (mine == null) return [];
  return peers
    .filter((peer) => peer.catalogue_key !== score.catalogue_key)
    .map((peer) => activeDimensionScore(peer, key))
    .filter((value): value is number => value != null)
    .map((peerScore) => mine - peerScore);
}

function evidenceIsThin(score: CatalogueHeadScore): boolean {
  return (
    score.head_recommendation_confidence !== "HIGH" ||
    score.active_catalogue_dim_count < 5
  );
}

type SalesCopy = {
  headline: string;
  pitch: string;
  code: CatalogueHeadReasonCode;
  benefits: HeadCardBenefit[];
};

/**
 * Face copy from golfer answers and active head scores only.
 * A missing answer or an inactive dimension cannot produce a benefit.
 */
function salesCopy(
  score: CatalogueHeadScore,
  peers: CatalogueHeadScore[],
  requirements: NormalisedRequirements
): SalesCopy | null {
  const eligible = COMPARED_DIMENSIONS.filter(
    (dimension) =>
      golferAsked(requirements, dimension.key) &&
      activeDimensionScore(score, dimension.key) != null
  );
  if (eligible.length === 0) return null;

  const leads = eligible.filter((dimension) => {
    const diffs = dimensionDiffs(score, peers, dimension.key);
    return diffs.some((diff) => diff > 0) && diffs.every((diff) => diff >= 0);
  });
  const pool = leads.length > 0 ? leads : eligible;
  const primary = [...pool].sort((a, b) => {
    const gapA = Math.max(0, ...dimensionDiffs(score, peers, a.key));
    const gapB = Math.max(0, ...dimensionDiffs(score, peers, b.key));
    if (gapA !== gapB) return gapB - gapA;
    const scoreA = activeDimensionScore(score, a.key) ?? 0;
    const scoreB = activeDimensionScore(score, b.key) ?? 0;
    if (scoreA !== scoreB) return scoreB - scoreA;
    return (
      COMPARED_DIMENSIONS.findIndex((dimension) => dimension.key === a.key) -
      COMPARED_DIMENSIONS.findIndex((dimension) => dimension.key === b.key)
    );
  })[0];
  if (!primary) return null;

  const diffs = dimensionDiffs(score, peers, primary.key);
  const higher = diffs.some((diff) => diff > 0) && diffs.every((diff) => diff >= 0);
  const lower = diffs.some((diff) => diff < 0) && diffs.every((diff) => diff <= 0);
  const allPeers = diffs.length > 0 && diffs.every((diff) => diff !== 0);
  const tied = diffs.length === 0 || diffs.every((diff) => diff === 0);
  const hedged = evidenceIsThin(score);
  const noun = BENEFIT_NOUN[primary.code];
  const opening = BENEFIT_OPENING[primary.code];
  const who = allPeers ? "the other recommended heads" : "another recommended head";

  let second: string;
  if (tied && peers.some((peer) => peer.catalogue_key !== score.catalogue_key)) {
    const mine = recordedProfilePhrase(score);
    const profileDiffers =
      mine != null &&
      peers.some(
        (peer) =>
          peer.catalogue_key !== score.catalogue_key && recordedProfilePhrase(peer) !== mine
      );
    second = profileDiffers
      ? `${mine?.replace(/\.$/, "")}, and the shared Fit means that description is not a ranking.`
      : hedged
        ? "It is similarly suited to the other recommended heads, but some of the evidence is still open."
        : "It is similarly suited to the other recommended heads on the characteristics we could check.";
  } else if (higher) {
    second = hedged
      ? `This head's assessed ${noun} is stronger than ${who}, but some of the evidence is still open.`
      : `This head's assessed ${noun} is stronger than ${who}, so it is worth considering if that is the trait you want.`;
  } else if (lower) {
    second = hedged
      ? `This head's assessed ${noun} is lighter than ${who}, and some of the evidence is still open.`
      : `This head's assessed ${noun} is lighter than ${who}, so it is a different balance rather than a stronger match on that trait.`;
  } else if (diffs.length > 0) {
    second = hedged
      ? `This head's assessed ${noun} sits between the other recommended heads, and some of the evidence is still open.`
      : `This head's assessed ${noun} sits between the other recommended heads.`;
  } else {
    second = hedged
      ? `This head's assessed ${noun} lines up with what you told us, but some of the evidence is still open.`
      : `This head's assessed ${noun} lines up with what you told us.`;
  }

  const benefits: HeadCardBenefit[] = hedged
    ? []
    : eligible
        .filter((dimension) => {
          const mine = activeDimensionScore(score, dimension.key);
          if (mine == null || mine < 70) return false;
          const gaps = dimensionDiffs(score, peers, dimension.key);
          if (gaps.length === 0) return true;
          return gaps.some((gap) => gap > 0) && gaps.every((gap) => gap >= 0);
        })
        .sort((a, b) => {
          const gapA = Math.max(0, ...dimensionDiffs(score, peers, a.key));
          const gapB = Math.max(0, ...dimensionDiffs(score, peers, b.key));
          return gapB - gapA;
        })
        .slice(0, 2)
        .map((dimension) => ({
          code: dimension.code,
          text: BENEFIT_CHIP[dimension.code],
        }));

  const profileCode = score.presentation_chars?.primary_head_profile;
  const profileChip = profileCode ? PROFILE_CHIP[profileCode] : null;
  const profileDiffersFromPeer =
    profileChip != null &&
    peers.some((peer) => {
      if (peer.catalogue_key === score.catalogue_key) return false;
      const peerCode = peer.presentation_chars?.primary_head_profile;
      const peerChip = peerCode ? PROFILE_CHIP[peerCode] : null;
      return peerChip !== profileChip;
    });
  const profileAlreadyInPitch = recordedProfilePhrase(score)
    ?.replace(/\.$/, "")
    ?? "";
  if (
    !hedged &&
    profileDiffersFromPeer &&
    profileChip &&
    benefits.length < 2 &&
    !`${opening} ${second}`.includes(profileAlreadyInPitch)
  ) {
    benefits.push({ code: "PROFILE", text: profileChip });
  }

  const comparedWithPeers = diffs.length > 0;
  const headline = hedged
    ? HEDGED_HEADLINE
    : tied && peers.some((peer) => peer.catalogue_key !== score.catalogue_key)
      ? "Similarly suited to your game."
      : higher || !comparedWithPeers
        ? BENEFIT_HEADLINE[primary.code]
        : "An alternative with a different balance.";

  return {
    headline,
    pitch: `${opening} ${second}`,
    code: primary.code,
    benefits,
  };
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
  requirements: NormalisedRequirements,
  peers: CatalogueHeadScore[] = []
): PresentedHeadCard {
  const [caveat, ...otherCaveats] = caveatsFor(score, requirements);
  const recognised = recognisedReason(explanation, score);
  const sales = salesCopy(score, peers, requirements);
  const compared = sales
    ? null
    : (comparisonReason(score, peers) ?? profileReason(score, peers));
  const reason: HeadCardReason | null = sales
    ? { source: "benefit", code: sales.code, text: sales.pitch }
    : compared ?? recognised;
  const aligned =
    explanation && explanation.catalogue_key === score.catalogue_key ? explanation : undefined;
  const year = score.release_year;
  const coverage =
    Number.isFinite(score.active_catalogue_dim_count)
      ? `Checked ${score.active_catalogue_dim_count} of 5 head traits.`
      : null;
  const assessedLabel = Number.isFinite(score.active_catalogue_dim_count)
    ? `${score.active_catalogue_dim_count} of 5 characteristics assessed`
    : null;
  const role = headCardRole(score, peers);
  const supporting = otherPlainReasons(explanation, score, reason);
  const profileDetail = recordedProfilePhrase(score);
  const profileDiffers =
    profileDetail != null &&
    peers.some(
      (peer) =>
        peer.catalogue_key !== score.catalogue_key &&
        recordedProfilePhrase(peer) !== profileDetail
    );
  const technicalComparison = sales ? comparisonReason(score, peers) : null;
  if (
    technicalComparison &&
    technicalComparison.text !== reason?.text &&
    !supporting.includes(technicalComparison.text)
  ) {
    supporting.push(technicalComparison.text);
  }
  if (
    profileDiffers &&
    profileDetail &&
    reason?.source !== "profile" &&
    !reason?.text.includes(profileDetail.replace(/\.$/, "")) &&
    !supporting.includes(`${profileDetail} That catalogue description is not a Fit ranking.`)
  ) {
    supporting.push(`${profileDetail} That catalogue description is not a Fit ranking.`);
  }
  if (
    recognised &&
    reason?.source !== "recognised" &&
    reason?.text !== recognised.text &&
    !supporting.includes(recognised.text)
  ) {
    supporting.unshift(recognised.text);
  }

  return {
    catalogueKey: score.catalogue_key,
    title: headTitle(score),
    role,
    roleLabel: role ? HEAD_CARD_ROLE_LABEL[role] : null,
    bandLabel: headSuitabilityBandLabel(score.catalogue_match_band),
    confidenceLabel: headEvidenceConfidenceLabel(score.head_recommendation_confidence),
    assessedLabel,
    headline: sales?.headline ?? null,
    benefits: sales?.benefits ?? [],
    releaseYear: year != null && Number.isFinite(year) ? year : null,
    reason,
    caveat: caveat ?? null,
    details: {
      otherCaveats: otherCaveats.map((item) => item.text),
      otherReasons: supporting,
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
    presentHeadCard(score, explanations[index], requirements, recommendations)
  );
}
