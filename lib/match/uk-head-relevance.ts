import { readFileSync } from "fs";
import { join } from "path";
import type { MatchIntelligence } from "./intelligence/load";

export const MATCH_UK_HEAD_RELEVANCE_VERSION =
  "MATCH_UK_HEAD_RELEVANCE_V1" as const;

/** ISO 3166-1 alpha-2 country code used by the research register. */
export const UK_MARKET_CODE_GB = "GB" as const;

export const UK_MARKET_STATUSES = [
  "UK_ESTABLISHED",
  "UK_OBSERVED",
  "UK_UNVERIFIED",
  "REGION_RESTRICTED",
] as const;

export const UK_MARKET_REVIEW_STATES = [
  "REVIEWED",
  "NEEDS_REVIEW",
  "NOT_REVIEWED",
] as const;

export type UkMarketStatus = (typeof UK_MARKET_STATUSES)[number];
export type UkMarketReviewState = (typeof UK_MARKET_REVIEW_STATES)[number];

export type UkHeadRelevanceMember = {
  catalogue_key: string;
  market_code: typeof UK_MARKET_CODE_GB;
  uk_market_status: UkMarketStatus;
  market_review_state: UkMarketReviewState;
  recommendation_eligible: boolean;
  hold_reason: string | null;
  evidence_class: string | null;
};

export type UkHeadRelevanceIndex = {
  version: typeof MATCH_UK_HEAD_RELEVANCE_VERSION;
  intelligence_heads_ref: string;
  source_register_ref: string;
  byCatalogueKey: ReadonlyMap<string, UkHeadRelevanceMember>;
};

export type UkEligibilityDecision = {
  recommendation_eligible: boolean;
  hold_reason: string | null;
  evidence_class: string | null;
};

/**
 * Derive V1 UK recommendation eligibility from market status + review state.
 * Positive classification alone is never enough without REVIEWED.
 */
export function deriveUkRecommendationEligibility(
  status: UkMarketStatus,
  review: UkMarketReviewState
): UkEligibilityDecision {
  if (status === "REGION_RESTRICTED") {
    return {
      recommendation_eligible: false,
      hold_reason: "REGION_RESTRICTED",
      evidence_class: status,
    };
  }
  if (status === "UK_UNVERIFIED") {
    return {
      recommendation_eligible: false,
      hold_reason: "UK_UNVERIFIED",
      evidence_class: status,
    };
  }
  if (review === "NEEDS_REVIEW") {
    return {
      recommendation_eligible: false,
      hold_reason: "NEEDS_REVIEW",
      evidence_class: status,
    };
  }
  if (review === "NOT_REVIEWED") {
    return {
      recommendation_eligible: false,
      hold_reason: "NOT_REVIEWED",
      evidence_class: status,
    };
  }
  if (
    review === "REVIEWED" &&
    (status === "UK_ESTABLISHED" || status === "UK_OBSERVED")
  ) {
    return {
      recommendation_eligible: true,
      hold_reason: null,
      evidence_class: status,
    };
  }
  return {
    recommendation_eligible: false,
    hold_reason: "INVALID_MAPPING",
    evidence_class: status,
  };
}

function isStatus(v: unknown): v is UkMarketStatus {
  return (
    typeof v === "string" &&
    (UK_MARKET_STATUSES as readonly string[]).includes(v)
  );
}

function isReview(v: unknown): v is UkMarketReviewState {
  return (
    typeof v === "string" &&
    (UK_MARKET_REVIEW_STATES as readonly string[]).includes(v)
  );
}

function isMember(raw: unknown): raw is UkHeadRelevanceMember {
  if (!raw || typeof raw !== "object") return false;
  const m = raw as Record<string, unknown>;
  return (
    typeof m.catalogue_key === "string" &&
    !!m.catalogue_key &&
    m.market_code === UK_MARKET_CODE_GB &&
    isStatus(m.uk_market_status) &&
    isReview(m.market_review_state) &&
    typeof m.recommendation_eligible === "boolean" &&
    (m.hold_reason === null || typeof m.hold_reason === "string") &&
    (m.evidence_class === null || typeof m.evidence_class === "string")
  );
}

/**
 * Load MATCH_UK_HEAD_RELEVANCE_V1. Fail closed on version/enum/key mismatches.
 * Requires exact coverage of every frozen DRIVER catalogue_key.
 */
export function loadUkHeadRelevanceOverlay(
  referenceDirectory: string,
  intelligence: Pick<MatchIntelligence, "heads">
): UkHeadRelevanceIndex {
  let raw: unknown;
  try {
    raw = JSON.parse(
      readFileSync(
        join(referenceDirectory, "uk-head-relevance.v1.json"),
        "utf8"
      )
    );
  } catch (err) {
    throw new Error(
      `UK head relevance overlay unavailable: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  if (!raw || typeof raw !== "object") {
    throw new Error("UK head relevance overlay is not an object");
  }
  const file = raw as Record<string, unknown>;
  if (file.overlay_version !== MATCH_UK_HEAD_RELEVANCE_VERSION) {
    throw new Error(
      `Unsupported UK head relevance overlay version: ${String(
        file.overlay_version
      )}`
    );
  }
  if (
    typeof file.intelligence_heads_ref !== "string" ||
    !file.intelligence_heads_ref
  ) {
    throw new Error("UK head relevance overlay missing intelligence_heads_ref");
  }
  if (
    typeof file.source_register_ref !== "string" ||
    !file.source_register_ref
  ) {
    throw new Error("UK head relevance overlay missing source_register_ref");
  }
  if (!Array.isArray(file.members) || file.members.length === 0) {
    throw new Error("UK head relevance overlay members must be non-empty");
  }

  const frozenDriverKeys = new Set<string>();
  for (const h of intelligence.heads) {
    if (
      String(h.category || "").toUpperCase() === "DRIVER" &&
      typeof h.catalogue_key === "string" &&
      h.catalogue_key
    ) {
      frozenDriverKeys.add(h.catalogue_key);
    }
  }

  const byCatalogueKey = new Map<string, UkHeadRelevanceMember>();
  for (const entry of file.members) {
    if (!isMember(entry)) {
      throw new Error(
        "UK head relevance overlay contains a malformed member (check market_code=GB and enums)"
      );
    }
    if (!frozenDriverKeys.has(entry.catalogue_key)) {
      throw new Error(
        `UK overlay references catalogue_key absent from frozen DRIVER heads: ${entry.catalogue_key}`
      );
    }
    if (byCatalogueKey.has(entry.catalogue_key)) {
      throw new Error(
        `UK overlay duplicate catalogue_key: ${entry.catalogue_key}`
      );
    }
    const derived = deriveUkRecommendationEligibility(
      entry.uk_market_status,
      entry.market_review_state
    );
    if (entry.recommendation_eligible !== derived.recommendation_eligible) {
      throw new Error(
        `UK overlay eligibility mismatch for ${entry.catalogue_key}: file=${entry.recommendation_eligible} derived=${derived.recommendation_eligible}`
      );
    }
    byCatalogueKey.set(entry.catalogue_key, entry);
  }

  Array.from(frozenDriverKeys).forEach((key) => {
    if (!byCatalogueKey.has(key)) {
      throw new Error(
        `UK overlay missing frozen DRIVER catalogue_key: ${key}`
      );
    }
  });

  if (byCatalogueKey.size !== frozenDriverKeys.size) {
    throw new Error(
      `UK overlay size ${byCatalogueKey.size} != frozen DRIVER count ${frozenDriverKeys.size}`
    );
  }

  return {
    version: MATCH_UK_HEAD_RELEVANCE_VERSION,
    intelligence_heads_ref: file.intelligence_heads_ref,
    source_register_ref: file.source_register_ref,
    byCatalogueKey,
  };
}

export function isUkMarketRecommendationEligible(
  catalogueKey: string,
  overlay: UkHeadRelevanceIndex | null | undefined
): boolean {
  if (!overlay) return false;
  const member = overlay.byCatalogueKey.get(catalogueKey);
  if (!member) return false;
  return member.recommendation_eligible;
}

export function ukHoldReasonFor(
  catalogueKey: string,
  overlay: UkHeadRelevanceIndex | null | undefined
): string | null {
  if (!overlay) return "UK_OVERLAY_UNAVAILABLE";
  const member = overlay.byCatalogueKey.get(catalogueKey);
  if (!member) return "MISSING_MAPPING";
  return member.hold_reason;
}
