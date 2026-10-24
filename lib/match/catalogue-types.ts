/**
 * Phase 2A catalogue recommendation types — intentionally separate from
 * listing CandidateScore / MatchSessionResult so Fit surfaces cannot be mixed.
 */

import type { CatalogueInventoryAttachment } from "./inventory/types";
import type { Band, ConfidenceBand, DimensionTrace, NormalisedRequirements } from "./types";

/**
 * Minimum independent catalogue head Fit dimensions that must be active
 * (session requirements + per-head evidence) before named heads are shown.
 *
 * Decision (Phase 2A Checkpoint A): require ≥2 of
 * {forgiveness, stability, workability, direction, head_launch}.
 * These are distinct Fit components with separate equipment fields; they are
 * counted as independent even when some share golfer evidence sources
 * (e.g. handicap informing both forgiveness and stability).
 * Not a Phase 1 Logic V1.2 constant — documented product gate only.
 */
export const CATALOGUE_MIN_INDEPENDENT_ACTIVE_DIMS = 2 as const;

export const CATALOGUE_RECOMMENDATION_KIND = "CATALOGUE_HEAD_SUITABILITY" as const;

export type CatalogueHeadScore = {
  /** Discriminator — never a listing_id. */
  kind: typeof CATALOGUE_RECOMMENDATION_KIND;
  catalogue_key: string;
  brand: string | null;
  model: string | null;
  display_name: string | null;
  /** From frozen intelligence; presentation tie-break only (never Fit). */
  release_year: number | null;
  excluded: boolean;
  exclusion_reasons?: string[];
  /** Catalogue Fit only (head characteristics; loft/shaft inactive). */
  catalogue_fit_score: number | null;
  catalogue_match_band: Band | null;
  suppressed: boolean;
  scorable: boolean;
  dimensions: Record<string, DimensionTrace>;
  guardrail_gaps: {
    direction: number | null;
    head_launch: number | null;
    loft: null;
    flex: null;
    shaft_launch: null;
  };
  active_catalogue_dim_count: number;
  /**
   * Phase 2A presentation confidence from golfer + equipment only.
   * Not Logic §38 overall confidence (no listing component).
   */
  head_recommendation_confidence_score: number | null;
  head_recommendation_confidence: ConfidenceBand | null;
  confidence_components: {
    golfer: number;
    equipment: number;
    /** Always omitted for catalogue pathway. */
    listing: null;
  };
  considerations: string[];
  /** Model-level only — not a handedness/loft/config availability claim. */
  scope_disclaimer: "MODEL_LEVEL_SUITABILITY_ONLY";
  /**
   * Presentation-only head labels for soft equal-Fit diversity.
   * Never used in Fit calculation.
   */
  presentation_chars?: {
    directional_bias: string | null;
    primary_head_profile: string | null;
    launch_tendency: string | null;
  };
};

export type CharacteristicGuidance = {
  handedness: "LEFT" | "RIGHT";
  preferred_loft_min_deg: number | null;
  preferred_loft_max_deg: number | null;
  shaft_flex_min_value: number | null;
  shaft_flex_max_value: number | null;
  shaft_weight_min_g: number | null;
  shaft_weight_max_g: number | null;
  shaft_launch_target: string;
  head_launch_target: string;
  directional_requirement: string;
  forgiveness_requirement: number | null;
  stability_requirement: number | null;
  workability_preference: number | null;
  notes: string[];
};

export type CatalogueRecommendationMode =
  | "NAMED_HEADS"
  | "CHARACTERISTIC_GUIDANCE"
  | "NO_DEFENSIBLE_HEADS"
  | "VALIDATION_ERROR";

export type CatalogueHeadExplanation = {
  catalogue_key: string;
  suitability_summary: string;
  reasons: string[];
  trade_offs: string[];
  uncertainty: string[];
};

export type ShaftGuidance = {
  available: boolean;
  flex_label: string | null;
  weight_label: string | null;
  launch_label: string | null;
  notes: string[];
};

export type CatalogueRecommendResult = {
  mode: CatalogueRecommendationMode;
  /** Empty when mode is not NAMED_HEADS. */
  recommendations: CatalogueHeadScore[];
  /**
   * Eligible top-band examples when differentiation is blocked.
   * Not a ranking and not assigned Best Match or Newer Option.
   */
  example_heads?: CatalogueHeadScore[];
  explanations: CatalogueHeadExplanation[];
  /**
   * Consumer labels for `recommendations`. Absent on older stored sessions.
   * Does not change Fit scores.
   */
  presentation_choices?: import("./app/present-head-choices").HeadChoice[];
  shaft_guidance: ShaftGuidance;
  characteristic_guidance: CharacteristicGuidance;
  /**
   * Checkpoint B inventory attach — empty when no recommendations or no stock.
   * Never mixed into CatalogueHeadScore.
   */
  inventory_attachments: CatalogueInventoryAttachment[];
  normalised_requirements: NormalisedRequirements;
  session: {
    resolved_catalogue_requirement_dims: number;
    min_required_dims: typeof CATALOGUE_MIN_INDEPENDENT_ACTIVE_DIMS;
    golfer_confidence: number;
  };
  /** Internal audit — omitted dimensions and gate reasons. */
  audit: {
    insufficient_evidence_reason: string | null;
    heads_scored: number;
    heads_excluded: number;
    heads_below_band: number;
    heads_insufficient_active_dims: number;
    heads_low_confidence: number;
    heads_suppressed: number;
    qualifying_heads: number;
    distinct_fit_scores: number;
    max_active_catalogue_dims: number;
    top_fit_share_count: number;
    qualifying_heads_before_family_dedupe: number;
    qualifying_families_after_dedupe: number;
    family_duplicates_suppressed: number;
    recommendations_returned: number;
    top_tied_family_count: number;
    top_tied_max_active_dims: number;
    top_tied_min_active_dims: number;
    heads_held_config_overlay: number;
    heads_held_uk_market: number;
    heads_uk_market_eligible: number;
    inventory_items_considered: number;
    inventory_items_attached: number;
  };
  versions: {
    contract: string;
    logic: string;
    heads: string;
    shafts: string;
    head_config_overlay: string;
    uk_head_relevance: string;
    catalogue_pathway: "PHASE_2A_CHECKPOINT_A";
    inventory_attach: "PHASE_2A_CHECKPOINT_B" | "NONE";
  };
  validation_errors?: string[];
};
