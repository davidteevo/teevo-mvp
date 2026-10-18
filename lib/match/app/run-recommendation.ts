import {
  CATALOGUE_MIN_INDEPENDENT_ACTIVE_DIMS,
  type CatalogueRecommendResult,
} from "../catalogue-types";
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
import { matchAdapterVersions } from "../versions";
import { buildCharacteristicGuidance, explainCatalogueHead } from "./explain";
import { attachInventoryToCatalogueRecommendations } from "./inventory-attach";
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

  const { recommendations, stats, differentiation_blocked } =
    rankCatalogueHeads(scored, 3);

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
    inventory_items_considered: inventory.length,
    inventory_items_attached: 0,
  };

  if (differentiation_blocked) {
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
      audit: {
        ...auditBase,
        insufficient_evidence_reason: "NO_MEANINGFUL_HEAD_DIFFERENTIATION",
      },
      versions,
    };
  }

  if (recommendations.length === 0) {
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

  return {
    mode: "NAMED_HEADS",
    recommendations,
    explanations: recommendations.map((r) => explainCatalogueHead(r, req)),
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
      inventory_items_attached: attached,
    },
    versions,
  };
}
