import { canonicalBrandId } from "../brands";
import type { CatalogueHeadScore } from "../catalogue-types";
import { CATALOGUE_HEAD_DIMENSIONS } from "../scoring/head-dimensions";
import type { UkHeadRelevanceIndex } from "../uk-head-relevance";
import {
  presentHeadChoices,
  type HeadChoice,
  type PresentationSubstitution,
  type PresentationSubstitutionFactor,
} from "./present-head-choices";

/**
 * Familiar UK brands used only when choosing a Best Match label.
 * This is not an eligibility list. Honma, XXIO and every other eligible
 * manufacturer can still be Best Match when no familiar head shares the
 * technical leader's dimension scores, or when their evidence is stronger.
 */
export const PRESENTATION_BRAND_ORDER = [
  "ping",
  "taylormade",
  "callaway",
  "titleist",
  "cobra",
  "srixon",
  "mizuno",
  "wilson",
  "cleveland",
  "pxg",
] as const;

/** Medium evidence reliability. Low (0.5) evidence cannot support an equivalence claim. */
const MEDIUM_RELIABILITY = 0.85;

export function characteristicEquivalenceKey(
  head: CatalogueHeadScore
): string | null {
  const parts: string[] = [];
  for (const name of CATALOGUE_HEAD_DIMENSIONS) {
    const trace = head.dimensions[name];
    if (!trace?.active || trace.score == null || !Number.isFinite(trace.score)) continue;
    if (!(trace.reliability >= MEDIUM_RELIABILITY)) return null;
    parts.push(`${name}=${trace.score}`);
  }
  return parts.length > 0 ? parts.join("|") : null;
}

export function evidenceStrength(head: CatalogueHeadScore): number {
  let sum = 0;
  for (const name of CATALOGUE_HEAD_DIMENSIONS) {
    const trace = head.dimensions[name];
    if (trace?.active && trace.reliability > 0) sum += trace.reliability;
  }
  return sum;
}

function ukRank(
  head: CatalogueHeadScore,
  uk: UkHeadRelevanceIndex | null | undefined
): number {
  const status = uk?.byCatalogueKey.get(head.catalogue_key)?.uk_market_status;
  if (status === "UK_ESTABLISHED") return 2;
  if (status === "UK_OBSERVED") return 1;
  return 0;
}

function familiarityRank(head: CatalogueHeadScore): number {
  const id = canonicalBrandId(head.brand);
  const order: readonly string[] = PRESENTATION_BRAND_ORDER;
  if (!id) return order.length;
  const index = order.indexOf(id);
  return index === -1 ? order.length : index;
}

function differentModel(a: CatalogueHeadScore, b: CatalogueHeadScore): boolean {
  const left = a.model?.trim().toLowerCase() ?? "";
  const right = b.model?.trim().toLowerCase() ?? "";
  if (left && right) return left !== right;
  return a.catalogue_key !== b.catalogue_key;
}

function uniqueHeads(heads: Array<CatalogueHeadScore | null | undefined>): CatalogueHeadScore[] {
  const seen = new Set<string>();
  const out: CatalogueHeadScore[] = [];
  for (const head of heads) {
    if (!head || seen.has(head.catalogue_key)) continue;
    seen.add(head.catalogue_key);
    out.push(head);
  }
  return out;
}

function preferenceFactors(
  best: CatalogueHeadScore,
  other: CatalogueHeadScore,
  uk: UkHeadRelevanceIndex | null | undefined
): PresentationSubstitutionFactor[] | null {
  if (evidenceStrength(best) > evidenceStrength(other)) return ["STRONGER_EVIDENCE"];
  if (ukRank(best, uk) > ukRank(other, uk)) return ["UK_ESTABLISHED_RELEVANCE"];
  if (familiarityRank(best) < familiarityRank(other)) return ["CONSUMER_FAMILIARITY"];
  return null;
}

function pickNewer(
  window: CatalogueHeadScore[],
  best: CatalogueHeadScore,
  reservedKey: string | null
): CatalogueHeadScore | null {
  const bestYear = best.release_year;
  if (bestYear == null || !Number.isFinite(bestYear)) return null;
  let chosen: CatalogueHeadScore | null = null;
  for (const head of window) {
    if (head.catalogue_key === best.catalogue_key) continue;
    if (reservedKey && head.catalogue_key === reservedKey) continue;
    if (head.catalogue_match_band !== best.catalogue_match_band) continue;
    if (!differentModel(head, best)) continue;
    const year = head.release_year;
    if (year == null || !Number.isFinite(year) || year <= bestYear) continue;
    if (!chosen || year > (chosen.release_year ?? 0)) chosen = head;
  }
  return chosen;
}

/**
 * Choose up to three heads to show. Fit scores are not changed.
 * A large exact-Fit tie keeps the engine shortlist, so familiarity cannot
 * invent a Best Match among many equal scores.
 */
export function selectPresentedCatalogueHeads(input: {
  technicalShortlist: CatalogueHeadScore[];
  familyWinners: CatalogueHeadScore[];
  topTiedFamilyCount: number;
  uk?: UkHeadRelevanceIndex | null;
}): { heads: CatalogueHeadScore[]; choices: HeadChoice[] } {
  const shortlist = input.technicalShortlist;
  if (shortlist.length === 0) return { heads: [], choices: [] };
  if (input.topTiedFamilyCount > 3) {
    return { heads: shortlist.slice(), choices: presentHeadChoices(shortlist) };
  }

  const leader = input.familyWinners[0] ?? shortlist[0];
  const leaderKey = characteristicEquivalenceKey(leader);
  const pool = leaderKey
    ? input.familyWinners.filter(
        (head) => characteristicEquivalenceKey(head) === leaderKey
      )
    : [leader];
  const ranked = pool
    .map((head, index) => ({ head, index }))
    .sort((a, b) => {
      const evidence = evidenceStrength(b.head) - evidenceStrength(a.head);
      if (evidence !== 0) return evidence;
      const market = ukRank(b.head, input.uk) - ukRank(a.head, input.uk);
      if (market !== 0) return market;
      const familiar = familiarityRank(a.head) - familiarityRank(b.head);
      if (familiar !== 0) return familiar;
      return a.index - b.index;
    });
  const best = ranked[0]?.head ?? leader;
  const compared =
    best.catalogue_key === leader.catalogue_key
      ? ranked.find((entry) => entry.head.catalogue_key !== best.catalogue_key)?.head
      : leader;
  const factors = compared ? preferenceFactors(best, compared, input.uk) : null;
  const equalSuitability =
    compared != null &&
    best.catalogue_fit_score != null &&
    best.catalogue_fit_score === compared.catalogue_fit_score;
  const substitution: PresentationSubstitution | null =
    factors && compared && (best.catalogue_key !== leader.catalogue_key || equalSuitability)
      ? {
          code: "PRESENTATION_EQUIVALENT_SUBSTITUTION",
          factors,
          technicalLeaderKey: compared.catalogue_key,
          equalSuitability,
        }
      : null;

  const alternative = best.catalogue_key === leader.catalogue_key ? null : leader;
  const window = uniqueHeads([...shortlist, best, leader]);
  const newer = pickNewer(window, best, alternative?.catalogue_key ?? null);
  const filler =
    alternative ??
    window.find(
      (head) =>
        head.catalogue_key !== best.catalogue_key &&
        head.catalogue_key !== newer?.catalogue_key
    ) ??
    null;
  const heads = uniqueHeads([best, filler, newer]).slice(0, 3);
  return {
    heads,
    choices: presentHeadChoices(heads, {
      bestCatalogueKey: best.catalogue_key,
      substitution,
    }),
  };
}
