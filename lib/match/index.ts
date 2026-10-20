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
export {
  scoreHeadCharacteristicDimensions,
  countResolvedCatalogueRequirementDims,
  countEvidenceBackedCatalogueRequirementDims,
  countActiveCatalogueDims,
  isMaterialHeadLaunchRequirement,
  hasUnresolvedLaunchEquipmentEvidence,
  CATALOGUE_HEAD_DIMENSIONS,
} from "./scoring/head-dimensions";
export {
  scoreCatalogueHead,
  rankCatalogueHeads,
  selectCatalogueShortlist,
  cataloguePresentationConfidence,
  collectQualifyingCatalogueHeads,
  lacksMeaningfulHeadDifferentiation,
  compareCataloguePresentationOrder,
  catalogueFitsEqual,
  sameCatalogueFitTier,
} from "./scoring/catalogue-head";
export {
  MATCH_HEAD_CONFIG_OVERLAY_VERSION,
  loadHeadConfigOverlay,
  familyKeyFor,
  isRecommendationEligible,
  dedupeByRecommendationFamily,
} from "./head-config-overlay";
export type {
  HeadConfigOverlay,
  HeadConfigOverlayIndex,
  HeadConfigOverlayMember,
  FamilyDedupeResult,
} from "./head-config-overlay";
export {
  MATCH_UK_HEAD_RELEVANCE_VERSION,
  UK_MARKET_CODE_GB,
  loadUkHeadRelevanceOverlay,
  isUkMarketRecommendationEligible,
  deriveUkRecommendationEligibility,
  ukHoldReasonFor,
} from "./uk-head-relevance";
export type {
  UkHeadRelevanceIndex,
  UkHeadRelevanceMember,
  UkMarketStatus,
  UkMarketReviewState,
} from "./uk-head-relevance";
export { runMatchSession } from "./pipeline";
export { validateMatchQuestionnaireInputs } from "./app/validate-inputs";
export { runCatalogueRecommendation } from "./app/run-recommendation";
export { buildShaftGuidance } from "./app/shaft-guidance";
export {
  explainCatalogueHead,
  buildCharacteristicGuidance,
} from "./app/explain";
export {
  selectRefinement,
  selectOptionalPostRecoveryQuestion,
  applyRefinementAnswer,
  isInformativeRefinementAnswer,
  REFINEMENT_MAX_B_STEPS,
} from "./app/refinement-policy";
export type {
  RefinementDecision,
  RefinementPathway,
  RefinementQuestion,
  RefinementQuestionId,
  SelectRefinementOptions,
} from "./app/refinement-policy";
export {
  commitRefinementProgress,
  mergeOfferedKey,
  preferFresherRefineState,
  fingerprintAnswers,
  EMPTY_REFINEMENT_STATE,
} from "./app/refinement-session";
export type { MatchRefinementState } from "./app/refinement-session";
export { matchReferenceDirectory } from "./app/intelligence-path";
export { attachInventoryToCatalogueRecommendations } from "./app/inventory-attach";
export {
  mapTeevoListingToInventoryItem,
  loadTeevoDriverListingsForMatch,
} from "./inventory/teevo-listings";
export type * from "./types";
export type * from "./catalogue-types";
export type * from "./inventory/types";
export {
  CATALOGUE_MIN_INDEPENDENT_ACTIVE_DIMS,
  CATALOGUE_RECOMMENDATION_KIND,
} from "./catalogue-types";
export type {
  ReadonlyHeadRecord,
  ReadonlyShaftRecord,
  MatchIntelligence,
} from "./intelligence/load";
export type { BrandRegistry, BrandRegistryEntry } from "./brands";
