export { matchAdapterVersions } from "./versions";
export { matchBandFromScore, confidenceFromScore } from "./bands";
export { scoreDimensionCurve } from "./scoring/curves";
export { aggregateFit } from "./scoring/aggregate";
export { guardrailForGap, applyGuardrails } from "./guardrails";
export { aggregateConfidence } from "./confidence";
export { speedRegion, carryRegion } from "./regions";
export { targetCategories } from "./category";
export { loftReachable } from "./loft";
export { isMatchEligible } from "./eligibility";
export { parseNumber } from "./parse";
export {
  resolveIdentity,
  collectHeadIdentityMatches,
  collectShaftIdentityMatches,
  resolveHeadIdentity,
  resolveShaftIdentity,
} from "./identity";
export {
  selectMarketplaceSlots,
  mergeLabels,
  moneySavingQualifies,
  brandMarketplace,
} from "./marketplace";
export {
  normalizeRequirements,
  golferEvidenceConfidence,
} from "./requirements";
export {
  loadMatchIntelligence,
  canonicalHeadBrandId,
} from "./intelligence/load";
export {
  buildBrandRegistry,
  canonicalBrandId,
  validateBrandSelection,
} from "./brands";
export { scoreCandidate, planListingLoft } from "./scoring/candidate";
export { runMatchSession } from "./pipeline";
export type * from "./types";
export type {
  ReadonlyHeadRecord,
  ReadonlyShaftRecord,
  MatchIntelligence,
} from "./intelligence/load";
export type { BrandRegistry, BrandRegistryEntry } from "./brands";
