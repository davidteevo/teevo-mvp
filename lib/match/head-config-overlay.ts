import { readFileSync } from "fs";
import { join } from "path";
import type { CatalogueHeadScore } from "./catalogue-types";
import type { MatchIntelligence } from "./intelligence/load";
import {
  isUkMarketRecommendationEligible,
  type UkHeadRelevanceIndex,
} from "./uk-head-relevance";

export const MATCH_HEAD_CONFIG_OVERLAY_VERSION =
  "MATCH_HEAD_CONFIG_OVERLAY_V1" as const;

export type HeadConfigOverlayMember = {
  catalogue_key: string;
  recommendation_family_key: string;
  canonical_catalogue_key: string;
  build_id: string;
  source_status: string;
  recommendation_eligible: boolean;
  hold_reason: string | null;
};

export type HeadConfigOverlay = {
  overlay_version: typeof MATCH_HEAD_CONFIG_OVERLAY_VERSION;
  intelligence_heads_ref: string;
  members: HeadConfigOverlayMember[];
};

export type HeadConfigOverlayIndex = {
  version: typeof MATCH_HEAD_CONFIG_OVERLAY_VERSION;
  intelligence_heads_ref: string;
  byCatalogueKey: ReadonlyMap<string, HeadConfigOverlayMember>;
};

export type FamilyDedupeResult = {
  recommendations: CatalogueHeadScore[];
  qualifying_heads_before_family_dedupe: number;
  qualifying_families_after_dedupe: number;
  family_duplicates_suppressed: number;
  heads_held_config_overlay: number;
  heads_held_uk_market: number;
  heads_uk_market_eligible: number;
};

type OverlayFile = {
  overlay_version?: string;
  intelligence_heads_ref?: string;
  members?: unknown;
};

function isMember(raw: unknown): raw is HeadConfigOverlayMember {
  if (!raw || typeof raw !== "object") return false;
  const m = raw as Record<string, unknown>;
  return (
    typeof m.catalogue_key === "string" &&
    !!m.catalogue_key &&
    typeof m.recommendation_family_key === "string" &&
    !!m.recommendation_family_key &&
    typeof m.canonical_catalogue_key === "string" &&
    !!m.canonical_catalogue_key &&
    typeof m.build_id === "string" &&
    typeof m.source_status === "string" &&
    typeof m.recommendation_eligible === "boolean" &&
    (m.hold_reason === null || typeof m.hold_reason === "string")
  );
}

/**
 * Load and validate the versioned head-config overlay.
 * Fail closed on unknown version, malformed members, or keys missing from freeze.
 */
export function loadHeadConfigOverlay(
  referenceDirectory: string,
  intelligence: Pick<MatchIntelligence, "headsByKey">
): HeadConfigOverlayIndex {
  const raw = JSON.parse(
    readFileSync(join(referenceDirectory, "head-config-overlay.v1.json"), "utf8")
  ) as OverlayFile;

  if (raw.overlay_version !== MATCH_HEAD_CONFIG_OVERLAY_VERSION) {
    throw new Error(
      `Unsupported head-config overlay version: ${String(raw.overlay_version)}`
    );
  }
  if (typeof raw.intelligence_heads_ref !== "string" || !raw.intelligence_heads_ref) {
    throw new Error("head-config overlay missing intelligence_heads_ref");
  }
  if (!Array.isArray(raw.members) || raw.members.length === 0) {
    throw new Error("head-config overlay members must be a non-empty array");
  }

  const byCatalogueKey = new Map<string, HeadConfigOverlayMember>();
  for (const entry of raw.members) {
    if (!isMember(entry)) {
      throw new Error("head-config overlay contains a malformed member");
    }
    if (!intelligence.headsByKey[entry.catalogue_key]) {
      throw new Error(
        `head-config overlay references unknown catalogue_key: ${entry.catalogue_key}`
      );
    }
    if (!intelligence.headsByKey[entry.canonical_catalogue_key]) {
      throw new Error(
        `head-config overlay references unknown canonical_catalogue_key: ${entry.canonical_catalogue_key}`
      );
    }
    if (!intelligence.headsByKey[entry.recommendation_family_key]) {
      throw new Error(
        `head-config overlay references unknown recommendation_family_key: ${entry.recommendation_family_key}`
      );
    }
    if (byCatalogueKey.has(entry.catalogue_key)) {
      throw new Error(
        `head-config overlay duplicate catalogue_key: ${entry.catalogue_key}`
      );
    }
    byCatalogueKey.set(entry.catalogue_key, entry);
  }

  return {
    version: MATCH_HEAD_CONFIG_OVERLAY_VERSION,
    intelligence_heads_ref: raw.intelligence_heads_ref,
    byCatalogueKey,
  };
}

export function familyKeyFor(
  catalogueKey: string,
  overlay: HeadConfigOverlayIndex | null | undefined
): string {
  const member = overlay?.byCatalogueKey.get(catalogueKey);
  return member?.recommendation_family_key ?? catalogueKey;
}

export function isRecommendationEligible(
  catalogueKey: string,
  overlay: HeadConfigOverlayIndex | null | undefined
): boolean {
  const member = overlay?.byCatalogueKey.get(catalogueKey);
  if (!member) return true;
  return member.recommendation_eligible;
}

/**
 * Keep at most one selectable head per recommendation family.
 * Input must already be in presentation order. Does not mutate Fit scores.
 * Family uniqueness is computed across the full ordered set; the caller limit
 * is applied only after dedupe (never dedupe-after-slice).
 *
 * When `ukOverlay` is provided, UK-market eligibility is required before a head
 * can win a family slot. When omitted, UK gate is not applied (unit tests).
 */
export function dedupeByRecommendationFamily(
  ordered: CatalogueHeadScore[],
  overlay: HeadConfigOverlayIndex | null | undefined,
  limit: number,
  ukOverlay?: UkHeadRelevanceIndex | null
): FamilyDedupeResult {
  const before = ordered.length;
  const seen = new Set<string>();
  const uniqueFamilies: CatalogueHeadScore[] = [];
  let suppressed = 0;
  let heads_held_config_overlay = 0;
  let heads_held_uk_market = 0;
  let heads_uk_market_eligible = 0;

  for (const head of ordered) {
    if (!isRecommendationEligible(head.catalogue_key, overlay)) {
      heads_held_config_overlay++;
      continue;
    }
    if (ukOverlay !== undefined) {
      if (!isUkMarketRecommendationEligible(head.catalogue_key, ukOverlay)) {
        heads_held_uk_market++;
        continue;
      }
      heads_uk_market_eligible++;
    }
    const family = familyKeyFor(head.catalogue_key, overlay);
    if (seen.has(family)) {
      suppressed++;
      continue;
    }
    seen.add(family);
    uniqueFamilies.push(head);
  }

  const recommendations = uniqueFamilies.slice(0, Math.max(0, limit));

  return {
    recommendations,
    qualifying_heads_before_family_dedupe: before,
    qualifying_families_after_dedupe: uniqueFamilies.length,
    family_duplicates_suppressed: suppressed,
    heads_held_config_overlay,
    heads_held_uk_market,
    heads_uk_market_eligible,
  };
}
