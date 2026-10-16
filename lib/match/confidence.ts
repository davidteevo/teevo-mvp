import { confidenceFromScore } from "./bands";
import type { ConfidenceBand } from "./types";

export function clampConfidence(score: number): number {
  return Math.max(0, Math.min(100, score));
}

export function aggregateConfidence(parts: {
  golfer: number;
  equipment: number;
  listing: number;
}): { score: number; confidence: ConfidenceBand } {
  const score = clampConfidence(
    0.45 * clampConfidence(parts.golfer) +
      0.35 * clampConfidence(parts.equipment) +
      0.2 * clampConfidence(parts.listing)
  );
  return { score, confidence: confidenceFromScore(score) };
}

export function reliabilityToEquipmentPoints(reliability: number): number {
  if (reliability >= 1) return 100;
  if (reliability >= 0.85) return 80;
  if (reliability >= 0.5) return 50;
  return 0;
}
