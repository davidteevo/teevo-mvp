/**
 * Inventory-ready contract between catalogue recommendations and purchasable stock.
 * Outside Phase 1 Fit scoring. Checkpoint B implements TEIVO_LISTING only.
 */

export type MatchInventorySourceType = "TEEVO_LISTING";

export type MatchPurchaseRoute = "TEEVO_CHECKOUT";

export type MatchInventoryAvailability =
  | "AVAILABLE"
  | "UNAVAILABLE"
  | "UNKNOWN";

export type MatchIdentityResolutionStatus =
  | "UNIQUE"
  | "AMBIGUOUS"
  | "UNRESOLVED";

export type MatchInventoryItem = {
  source_listing_id: string;
  merchant_id: string | null;
  source_type: MatchInventorySourceType;
  head_key: string | null;
  shaft_key: string | null;
  listed_config: {
    brand: string | null;
    model: string | null;
    handedness: "LEFT" | "RIGHT" | null;
    stated_loft_deg: number | null;
    shaft_label: string | null;
    shaft_flex_raw: string | null;
  };
  condition: string | null;
  price_minor: number;
  /**
   * Public seller photo for this listing. Null when none is published.
   * Never a catalogue or studio stand-in. Omitted by older fixtures.
   */
  primary_image_url?: string | null;
  currency: "GBP";
  availability_status: MatchInventoryAvailability;
  availability_checked_at: string;
  purchase_route: MatchPurchaseRoute;
  identity: {
    head_resolution: MatchIdentityResolutionStatus;
    shaft_resolution: MatchIdentityResolutionStatus;
    evidence: string[];
  };
};

/** Presentation attach for a catalogue head — separate from CatalogueHeadScore. */
export type CatalogueInventoryAttachment = {
  catalogue_key: string;
  items: MatchInventoryAttachedRow[];
};

export type MatchInventoryAttachedRow = {
  item: MatchInventoryItem;
  /** Head-only vs full Phase 1 listing score path. */
  attach_mode: "HEAD_ONLY" | "FULL_LISTING_MATCH";
  unverified_shaft: boolean;
  /** Present only for FULL_LISTING_MATCH after successful scoreCandidate. */
  listing_match: {
    listing_id: string;
    match_band: string;
    confidence: string;
    raw_fit_score: number;
  } | null;
};
