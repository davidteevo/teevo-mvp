import {
  CATALOGUE_MIN_INDEPENDENT_ACTIVE_DIMS,
  type CatalogueRecommendResult,
} from "../catalogue-types";
import type { HeadConfigOverlayIndex } from "../head-config-overlay";
import { loadHeadConfigOverlay } from "../head-config-overlay";
import type { MatchInventoryItem } from "../inventory/types";
import type { MatchIntelligence } from "../intelligence/load";
import {
  golferEvidenceConfidence,
  normalizeRequirements,
} from "../requirements";
import {
  rankCatalogueHeads,
  scoreCatalogueHead,
} from "../scoring/catalogue-head";
import {
  countEvidenceBackedCatalogueRequirementDims,
  countResolvedCatalogueRequirementDims,
} from "../scoring/head-dimensions";
import type { UkHeadRelevanceIndex } from "../uk-head-relevance";
import { loadUkHeadRelevanceOverlay } from "../uk-head-relevance";
import { matchAdapterVersions } from "../versions";
import { selectPresentedCatalogueHeads } from "./present-catalogue-selection";
import { buildCharacteristicGuidance, explainCatalogueHead } from "./explain";
import { attachInventoryToCatalogueRecommendations } from "./inventory-attach";
import { matchReferenceDirectory } from "./intelligence-path";
import { buildShaftGuidance } from "./shaft-guidance";
import { validateMatchQuestionnaireInputs } from "./validate-inputs";

function emptyAudit(
  reason: string | null,
  patch: Partial<CatalogueRecommendResult["audit"]> = {}
): CatalogueRecommendResult["audit"] {
  return {
    insufficient_evidence_reason: reason,
    heads_scored: 0,
    heads_excluded: 0,
    heads_below_band: 0,
    heads_insufficient_active_dims: 0,
    heads_low_confidence: 0,
    heads_suppressed: 0,
    qualifying_heads: 0,
    distinct_fit_scores: 0,
    max_active_catalogue_dims: 0,
    top_fit_share_count: 0,
    qualifying_heads_before_family_dedupe: 0,
    qualifying_families_after_dedupe: 0,
    family_duplicates_suppressed: 0,
    recommendations_returned: 0,
    top_tied_family_count: 0,
    top_tied_max_active_dims: 0,
    top_tied_min_active_dims: 0,
    heads_held_config_overlay: 0,
    heads_held_uk_market: 0,
    heads_uk_market_eligible: 0,
    inventory_items_considered: 0,
    inventory_items_attached: 0,
    ...patch,
  };
}

export function runCatalogueRecommendation(input: {
  answers: Record<string, unknown>;
  intelligence: MatchIntelligence;
  /** Checkpoint B: optional Teevo inventory already mapped to contract. */
  inventory?: MatchInventoryItem[];
  /** Optional overlay; defaults to reference head-config-overlay.v1.json. */
  headConfigOverlay?: HeadConfigOverlayIndex | null;
  /**
   * UK market overlay. Defaults to loading reference uk-head-relevance.v1.json.
   * Pass explicitly for tests. Omitting UK (undefined default load) fails closed
   * to guidance if the overlay is missing/invalid — never recommends unverified heads.
   * Pass a concrete index to apply UK gating; pass the sentinel skip only in
   * unit tests via `skipUkMarketGate`.
   */
  ukHeadRelevance?: UkHeadRelevanceIndex | null;
  /** When true, skip UK gate (unit tests only). Production never sets this. */
  skipUkMarketGate?: boolean;
  /** Override reference directory used when loading the default overlay. */
  referenceDirectory?: string;
}): CatalogueRecommendResult {
  const inventory = input.inventory ?? [];
  const versions = {
    ...matchAdapterVersions(),
    catalogue_pathway: "PHASE_2A_CHECKPOINT_A" as const,
    inventory_attach:
      inventory.length > 0
        ? ("PHASE_2A_CHECKPOINT_B" as const)
        : ("NONE" as const),
  };

  const referenceDirectory =
    input.referenceDirectory ?? matchReferenceDirectory();

  const overlay =
    input.headConfigOverlay === undefined
      ? loadHeadConfigOverlay(referenceDirectory, input.intelligence)
      : input.headConfigOverlay;

  let ukOverlay: UkHeadRelevanceIndex | null | undefined = undefined;
  if (input.skipUkMarketGate) {
    ukOverlay = undefined;
  } else if (input.ukHeadRelevance !== undefined) {
    ukOverlay = input.ukHeadRelevance;
  } else {
    try {
      ukOverlay = loadUkHeadRelevanceOverlay(
        referenceDirectory,
        input.intelligence
      );
    } catch (err) {
      const emptyReq = normalizeRequirements(
        {
          handedness: "RIGHT",
          input_source: "QUESTIONNAIRE",
          input_confidence: "LOW",
        },
        input.intelligence.headsByKey
      );
      const shaft_guidance = buildShaftGuidance(emptyReq);
      const characteristic_guidance = buildCharacteristicGuidance(emptyReq);
      characteristic_guidance.notes.unshift(
        "UK market relevance overlay is unavailable or invalid. Named recommendations are withheld fail-closed."
      );
      console.error(
        "[match] UK_MARKET_OVERLAY_UNAVAILABLE",
        err instanceof Error ? err.message : String(err)
      );
      return {
        mode: "CHARACTERISTIC_GUIDANCE",
        recommendations: [],
        explanations: [],
        shaft_guidance,
        characteristic_guidance,
        inventory_attachments: [],
        normalised_requirements: emptyReq,
        session: {
          resolved_catalogue_requirement_dims: 0,
          min_required_dims: CATALOGUE_MIN_INDEPENDENT_ACTIVE_DIMS,
          golfer_confidence: 0,
        },
        audit: emptyAudit("UK_MARKET_OVERLAY_UNAVAILABLE", {
          inventory_items_considered: inventory.length,
        }),
        versions,
      };
    }
  }

  const validated = validateMatchQuestionnaireInputs(input.answers);
  if (!validated.ok) {
    const emptyReq = normalizeRequirements(
      {
        handedness: "RIGHT",
        input_source: "QUESTIONNAIRE",
        input_confidence: "LOW",
      },
      input.intelligence.headsByKey
    );
    return {
      mode: "VALIDATION_ERROR",
      recommendations: [],
      explanations: [],
      shaft_guidance: buildShaftGuidance(emptyReq),
      characteristic_guidance: buildCharacteristicGuidance(emptyReq),
      inventory_attachments: [],
      normalised_requirements: emptyReq,
      session: {
        resolved_catalogue_requirement_dims: 0,
        min_required_dims: CATALOGUE_MIN_INDEPENDENT_ACTIVE_DIMS,
        golfer_confidence: 0,
      },
      audit: emptyAudit("VALIDATION_ERROR", {
        inventory_items_considered: inventory.length,
      }),
      versions,
      validation_errors: validated.errors,
    };
  }

  const req = normalizeRequirements(
    validated.raw,
    input.intelligence.headsByKey
  );
  const golfer = golferEvidenceConfidence(validated.raw, req.conflict_flags);
  const resolvedDims = countResolvedCatalogueRequirementDims(req);
  const evidenceBackedDims = countEvidenceBackedCatalogueRequirementDims(req);
  const shaft_guidance = buildShaftGuidance(req);
  const characteristic_guidance = buildCharacteristicGuidance(req);

  if (evidenceBackedDims < CATALOGUE_MIN_INDEPENDENT_ACTIVE_DIMS) {
    return {
      mode: "CHARACTERISTIC_GUIDANCE",
      recommendations: [],
      explanations: [],
      shaft_guidance,
      characteristic_guidance,
      inventory_attachments: [],
      normalised_requirements: req,
      session: {
        resolved_catalogue_requirement_dims: resolvedDims,
        min_required_dims: CATALOGUE_MIN_INDEPENDENT_ACTIVE_DIMS,
        golfer_confidence: golfer,
      },
      audit: emptyAudit("INSUFFICIENT_EVIDENCE_BACKED_REQUIREMENT_DIMS", {
        inventory_items_considered: inventory.length,
      }),
      versions,
    };
  }

  const scored = input.intelligence.eligibleHeads.map((head) =>
    scoreCatalogueHead({
      head,
      requirements: req,
      golferConfidence: golfer,
    })
  );

  const {
    recommendations: technicalShortlist,
    family_winners,
    stats,
    family_stats,
    differentiation_blocked,
    example_heads,
  } = rankCatalogueHeads(scored, 3, overlay, ukOverlay, req);

  const auditBase = {
    heads_scored: stats.scored,
    heads_excluded: stats.excluded,
    heads_below_band: stats.below_band,
    heads_insufficient_active_dims: stats.insufficient_active_dims,
    heads_low_confidence: stats.low_confidence,
    heads_suppressed: stats.suppressed,
    qualifying_heads: stats.qualifying_heads,
    distinct_fit_scores: stats.distinct_fit_scores,
    max_active_catalogue_dims: stats.max_active_catalogue_dims,
    top_fit_share_count: stats.top_fit_share_count,
    qualifying_heads_before_family_dedupe:
      family_stats.qualifying_heads_before_family_dedupe,
    qualifying_families_after_dedupe:
      family_stats.qualifying_families_after_dedupe,
    family_duplicates_suppressed: family_stats.family_duplicates_suppressed,
      recommendations_returned: 0,
    top_tied_family_count: family_stats.top_tied_family_count,
    top_tied_max_active_dims: family_stats.top_tied_max_active_dims,
    top_tied_min_active_dims: family_stats.top_tied_min_active_dims,
    heads_held_config_overlay: family_stats.heads_held_config_overlay,
    heads_held_uk_market: family_stats.heads_held_uk_market,
    heads_uk_market_eligible: family_stats.heads_uk_market_eligible,
    inventory_items_considered: inventory.length,
    inventory_items_attached: 0,
  };

  if (differentiation_blocked) {
    return {
      mode: "CHARACTERISTIC_GUIDANCE",
      recommendations: [],
      example_heads,
      explanations: [],
      shaft_guidance,
      characteristic_guidance: buildCharacteristicGuidance(req, {
        differentiationBlocked: true,
        topTiedFamilyCount: family_stats.top_tied_family_count,
        topTiedMinActiveDims: family_stats.top_tied_min_active_dims,
      }),
      inventory_attachments: [],
      normalised_requirements: req,
      session: {
        resolved_catalogue_requirement_dims: resolvedDims,
        min_required_dims: CATALOGUE_MIN_INDEPENDENT_ACTIVE_DIMS,
        golfer_confidence: golfer,
      },
      audit: {
        ...auditBase,
        insufficient_evidence_reason: "NO_MEANINGFUL_HEAD_DIFFERENTIATION",
      },
      versions,
    };
  }

  if (technicalShortlist.length === 0) {
    return {
      mode: "NO_DEFENSIBLE_HEADS",
      recommendations: [],
      explanations: [],
      shaft_guidance,
      characteristic_guidance,
      inventory_attachments: [],
      normalised_requirements: req,
      session: {
        resolved_catalogue_requirement_dims: resolvedDims,
        min_required_dims: CATALOGUE_MIN_INDEPENDENT_ACTIVE_DIMS,
        golfer_confidence: golfer,
      },
      audit: {
        ...auditBase,
        insufficient_evidence_reason: "NO_HEAD_PASSED_CATALOGUE_GATES",
      },
      versions,
    };
  }

  const presented = selectPresentedCatalogueHeads({
    technicalShortlist,
    familyWinners: family_winners,
    topTiedFamilyCount: family_stats.top_tied_family_count,
    uk: ukOverlay ?? null,
  });
  const recommendations = presented.heads;

  const inventory_attachments = attachInventoryToCatalogueRecommendations({
    recommendations,
    inventory,
    requirements: req,
    intelligence: input.intelligence,
    golferConfidence: golfer,
  });
  const attached = inventory_attachments.reduce(
    (n, a) => n + a.items.length,
    0
  );

  const hasEqualFitAmongNamed = recommendations.some((a, i) =>
    recommendations.slice(i + 1).some(
      (b) =>
        a.catalogue_match_band === b.catalogue_match_band &&
        a.catalogue_fit_score === b.catalogue_fit_score
    )
  );

  return {
    mode: "NAMED_HEADS",
    recommendations,
    explanations: recommendations.map((r) =>
      explainCatalogueHead(r, req, { equalFitAmongNamed: hasEqualFitAmongNamed })
    ),
    presentation_choices: presented.choices,
    shaft_guidance,
    characteristic_guidance,
    inventory_attachments,
    normalised_requirements: req,
    session: {
      resolved_catalogue_requirement_dims: resolvedDims,
      min_required_dims: CATALOGUE_MIN_INDEPENDENT_ACTIVE_DIMS,
      golfer_confidence: golfer,
    },
    audit: {
      ...auditBase,
      insufficient_evidence_reason: null,
      recommendations_returned: recommendations.length,
      inventory_items_attached: attached,
    },
    versions,
  };
}
