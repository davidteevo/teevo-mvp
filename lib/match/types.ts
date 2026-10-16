export type Band =
  | "DO_NOT_ACTIVELY_RECOMMEND"
  | "GOOD_MATCH"
  | "VERY_GOOD_MATCH"
  | "EXCELLENT_MATCH";

export type ConfidenceBand = "HIGH" | "MEDIUM" | "LOW";

export type RequirementBand = "HIGH" | "MEDIUM" | "LOW" | "UNRESOLVED";

export type LaunchCategory =
  | "LOW"
  | "MID_LOW"
  | "MID"
  | "MID_HIGH"
  | "HIGH"
  | "ANY"
  | "UNRESOLVED";

export type DirectionCategory =
  | "STRONG_FADE_ASSIST"
  | "FADE_ASSIST"
  | "NEUTRAL"
  | "DRAW_ASSIST"
  | "STRONG_DRAW_ASSIST"
  | "UNRESOLVED";

export type DimensionName =
  | "forgiveness"
  | "stability"
  | "direction"
  | "head_launch"
  | "head_spin"
  | "workability"
  | "loft"
  | "flex"
  | "weight"
  | "shaft_launch"
  | "shaft_spin";

export const DIMENSION_WEIGHTS: Record<DimensionName, number> = {
  forgiveness: 15,
  stability: 15,
  direction: 13,
  head_launch: 10,
  head_spin: 6,
  workability: 5,
  loft: 14,
  flex: 10,
  weight: 5,
  shaft_launch: 4,
  shaft_spin: 3,
};

export const DIMENSION_NAMES = Object.keys(DIMENSION_WEIGHTS) as DimensionName[];

export type RequirementConfidenceEntry = {
  band: RequirementBand;
  source_codes: string[];
  conflict_codes: string[];
};

export type NormalisedRequirements = {
  handedness: "LEFT" | "RIGHT";
  recommendation_intent: "UNANCHORED" | "PRESERVE" | "OPTIMISE" | "CORRECT";
  head_launch_target: LaunchCategory;
  head_launch_target_numeric: number | null;
  head_spin_target: LaunchCategory;
  forgiveness_requirement: number | null;
  stability_requirement: number | null;
  directional_target_numeric: number | null;
  directional_requirement: DirectionCategory;
  workability_preference: number | null;
  driver_subtype_allowed: "STANDARD";
  preferred_loft_min_deg: number | null;
  preferred_loft_max_deg: number | null;
  shaft_weight_min_g: number | null;
  shaft_weight_max_g: number | null;
  shaft_flex_min_value: number | null;
  shaft_flex_max_value: number | null;
  shaft_launch_target: LaunchCategory;
  shaft_launch_target_numeric: number | null;
  shaft_spin_target: LaunchCategory;
  shaft_torque_target_deg: null;
  conflict_flags: string[];
  requirement_confidence: Record<DimensionName, RequirementConfidenceEntry>;
};

export type RawGolferInputs = Record<string, unknown>;

export type DimensionTrace = {
  active: boolean;
  nominal_weight: number;
  reliability: number;
  score: number | null;
  omission_reason?: string;
};

export type ListingConfidenceDeduction = {
  code: string;
  amount: number;
};

export type CandidateScore = {
  listing_id: string;
  excluded: boolean;
  exclusion_reasons?: string[];
  raw_fit_score?: number | null;
  match_band?: Band | null;
  suppressed?: boolean;
  dimensions?: Record<DimensionName, DimensionTrace>;
  guardrail_gaps?: Record<string, number | null>;
  confidence_components?: { golfer: number; equipment: number; listing: number };
  confidence_score?: number | null;
  confidence?: ConfidenceBand | null;
  considerations?: string[];
  listing_confidence_deductions?: ListingConfidenceDeduction[];
  scorable?: boolean;
};

export type MarketplacePreferences = {
  /** Canonical head-brand IDs; missing/[] means all brands. Outside fitting requirements. */
  brand_ids?: string[] | null;
};

export type MarketplaceCandidate = {
  listing_id: string;
  score: number;
  price_gbp: number;
  band: Band;
  confidence: ConfidenceBand;
  confidence_score?: number;
  suppressed?: boolean;
  head_brand_id?: string;
  publicly_purchasable?: boolean;
};

export type InventoryListing = {
  listing_id: string;
  head_key: string;
  shaft_key: string | null;
  handedness: string;
  stated_loft_deg: number | null;
  publicly_purchasable: boolean;
  price_gbp: number;
  condition?: string;
  seller_trust?: string;
  delivery_days?: number;
};
