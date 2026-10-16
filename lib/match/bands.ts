import type { Band, ConfidenceBand } from "./types";

export function matchBandFromScore(score: number): Band {
  if (score >= 85) return "EXCELLENT_MATCH";
  if (score >= 75) return "VERY_GOOD_MATCH";
  if (score >= 65) return "GOOD_MATCH";
  return "DO_NOT_ACTIVELY_RECOMMEND";
}

export function confidenceFromScore(score: number): ConfidenceBand {
  if (score >= 80) return "HIGH";
  if (score >= 60) return "MEDIUM";
  return "LOW";
}

export const BAND_RANK: Record<Band, number> = {
  DO_NOT_ACTIVELY_RECOMMEND: 0,
  GOOD_MATCH: 1,
  VERY_GOOD_MATCH: 2,
  EXCELLENT_MATCH: 3,
};
