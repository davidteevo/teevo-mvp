export type AggregateDimensionInput = {
  weight: number;
  reliability: number;
  score: number;
};

export type AggregateResult =
  | { score: number; scorable: true }
  | { score: null; scorable: false; reason: "NO_ACTIVE_FIT_DIMENSIONS" };

export function aggregateFit(
  dimensions: AggregateDimensionInput[]
): AggregateResult {
  let num = 0;
  let den = 0;
  for (const d of dimensions) {
    if (!(d.reliability > 0)) continue;
    num += d.score * d.weight * d.reliability;
    den += d.weight * d.reliability;
  }
  if (den === 0) {
    return {
      score: null,
      scorable: false,
      reason: "NO_ACTIVE_FIT_DIMENSIONS",
    };
  }
  return { score: num / den, scorable: true };
}

/**
 * Catalogue suitability only. Evidence reliability stays in confidence.
 * Listing Fit continues to use aggregateFit.
 */
export function aggregateCatalogueSuitability(
  dimensions: Array<{ weight: number; score: number }>
): AggregateResult {
  let num = 0;
  let den = 0;
  for (const d of dimensions) {
    num += d.score * d.weight;
    den += d.weight;
  }
  if (den === 0) {
    return {
      score: null,
      scorable: false,
      reason: "NO_ACTIVE_FIT_DIMENSIONS",
    };
  }
  return { score: num / den, scorable: true };
}
