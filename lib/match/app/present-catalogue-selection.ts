import { canonicalBrandId } from "../brands";
import type { CatalogueHeadScore } from "../catalogue-types";
import { CATALOGUE_HEAD_DIMENSIONS } from "../scoring/head-dimensions";
import type { NormalisedRequirements } from "../types";
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
    if (
      !chosen ||
      (head.catalogue_fit_score ?? -1) > (chosen.catalogue_fit_score ?? -1) ||
      ((head.catalogue_fit_score ?? -1) === (chosen.catalogue_fit_score ?? -1) &&
        manufacturerId(head) !== manufacturerId(best) &&
        manufacturerId(chosen) === manufacturerId(best)) ||
      ((head.catalogue_fit_score ?? -1) === (chosen.catalogue_fit_score ?? -1) &&
        manufacturerId(head) === manufacturerId(chosen) &&
        year > (chosen.release_year ?? 0))
    ) {
      chosen = head;
    }
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
  requirements?: NormalisedRequirements | null;
}): { heads: CatalogueHeadScore[]; choices: HeadChoice[]; diversitySelection: DiversitySelection | null } {
  const shortlist = input.technicalShortlist;
  if (shortlist.length === 0) return { heads: [], choices: [], diversitySelection: null };
  if (input.topTiedFamilyCount > 3) {
    return {
      heads: shortlist.slice(),
      choices: shortlist.map((head) => ({
        catalogueKey: head.catalogue_key,
        category: null,
        label: null,
        tiedForTopSuitability: false,
        note: null,
        substitution: null,
      })),
      diversitySelection: null,
    };
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

  const sameScoreOthers = input.familyWinners.filter(
    (head) =>
      head.catalogue_key !== best.catalogue_key &&
      head.catalogue_fit_score != null &&
      head.catalogue_fit_score === best.catalogue_fit_score
  );
  const diverseAlternative =
    sameScoreOthers.length > 0
      ? selectDiverseEquivalentHeads({
          heads: sameScoreOthers,
          uk: input.uk,
          alreadySelected: [best],
          limit: 1,
        })[0]?.head ?? null
      : null;
  const alternative =
    diverseAlternative ?? (best.catalogue_key === leader.catalogue_key ? null : leader);
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
  const assembled = uniqueHeads([best, filler, newer]).slice(0, 3);
  const diversified = substituteLowerSameManufacturer({
    heads: assembled,
    pool: input.familyWinners,
    best,
    requirements: input.requirements,
    uk: input.uk,
  });
  return {
    heads: diversified.heads,
    choices: presentHeadChoices(diversified.heads, {
      bestCatalogueKey: best.catalogue_key,
      substitution,
    }),
    diversitySelection: diversified.selection,
  };
}

function newerEligible(head: CatalogueHeadScore, best: CatalogueHeadScore): boolean {
  const year = head.release_year;
  const bestYear = best.release_year;
  if (year == null || bestYear == null || year <= bestYear) return false;
  if (head.catalogue_match_band !== best.catalogue_match_band) return false;
  return differentModel(head, best);
}

function relevantDimensionNames(
  requirements: NormalisedRequirements | null | undefined
): string[] {
  if (!requirements) return ["forgiveness", "stability", "direction", "head_launch"];
  const names: string[] = [];
  if (requirements.forgiveness_requirement != null) names.push("forgiveness");
  if (requirements.stability_requirement != null) names.push("stability");
  if (
    requirements.directional_target_numeric != null &&
    Math.abs(requirements.directional_target_numeric) >= 1
  ) {
    names.push("direction");
  }
  if (
    requirements.head_launch_target !== "UNRESOLVED" &&
    requirements.head_launch_target_numeric != null
  ) {
    names.push("head_launch");
  }
  if ((requirements.workability_preference ?? 0) >= 3) names.push("workability");
  return names;
}

function hasImportantDeficiency(
  candidate: CatalogueHeadScore,
  replaced: CatalogueHeadScore,
  requirements: NormalisedRequirements | null | undefined
): boolean {
  for (const name of relevantDimensionNames(requirements)) {
    const current = replaced.dimensions[name];
    const next = candidate.dimensions[name];
    if (!current?.active || current.score == null) continue;
    if (!next?.active || next.score == null) return true;
    if (current.score >= 85 && next.score < 85) return true;
    if (next.score < current.score - 15) return true;
  }
  return false;
}

/**
 * When a unique Best Match is followed by two same-manufacturer heads on one
 * lower score, a different manufacturer at that exact score can take the
 * spare slot. The Best Match and a qualifying Newer Option stay in place.
 */
export function substituteLowerSameManufacturer(input: {
  heads: CatalogueHeadScore[];
  pool: CatalogueHeadScore[];
  best: CatalogueHeadScore;
  requirements?: NormalisedRequirements | null;
  uk?: UkHeadRelevanceIndex | null;
}): { heads: CatalogueHeadScore[]; selection: DiversitySelection | null } {
  const unchanged = { heads: input.heads, selection: null };
  if (input.heads.length < 3) return unchanged;
  const best = input.best;
  const others = input.heads.filter((head) => head.catalogue_key !== best.catalogue_key);
  if (others.length !== 2) return unchanged;
  const [first, second] = others;
  const shared = first.catalogue_fit_score;
  if (
    shared == null ||
    shared !== second.catalogue_fit_score ||
    best.catalogue_fit_score == null ||
    !(best.catalogue_fit_score > shared)
  ) {
    return unchanged;
  }
  if (manufacturerId(first) !== manufacturerId(second)) return unchanged;

  const firstNewer = newerEligible(first, best);
  const secondNewer = newerEligible(second, best);
  let replace = second;
  if (firstNewer && !secondNewer) replace = second;
  else if (secondNewer && !firstNewer) replace = first;
  else if (firstNewer && secondNewer) {
    replace =
      (first.release_year ?? 0) >= (second.release_year ?? 0) ? second : first;
  }

  const stock = new Set<string>();
  const candidates = input.pool
    .filter(
      (head) =>
        head.catalogue_key !== best.catalogue_key &&
        head.catalogue_key !== first.catalogue_key &&
        head.catalogue_key !== second.catalogue_key &&
        head.catalogue_fit_score === shared &&
        manufacturerId(head) !== manufacturerId(replace) &&
        comparableSupport(head, replace) &&
        ukRank(head, input.uk) >= ukRank(replace, input.uk) &&
        !hasImportantDeficiency(head, replace, input.requirements)
    )
    .sort((a, b) => compareSupported(a, b, input.uk, stock));
  const candidate = candidates[0];
  if (!candidate) return unchanged;
  return {
    heads: input.heads.map((head) =>
      head.catalogue_key === replace.catalogue_key ? candidate : head
    ),
    selection: {
      head: candidate,
      reasons: ["DIFFERENT_MANUFACTURER"],
    },
  };
}

/**
 * How a displayed set is chosen from drivers that already share suitability.
 * This order never changes the suitability score.
 * 1. Equipment evidence quality
 * 2. Verified UK-market relevance
 * 3. Comparable support (medium evidence or better, within one reliability step)
 * 4. A different manufacturer, when one is equally supported
 * 5. A different recorded characteristic profile
 * 6. Actual Teevo inventory availability
 * 7. A different release generation
 * 8. Consumer familiarity
 * 9. Catalogue key, so the result stays repeatable
 */
export const SUITABLE_EXAMPLE_PRECEDENCE = [
  "EQUIPMENT_EVIDENCE",
  "UK_MARKET_RELEVANCE",
  "COMPARABLE_SUPPORT",
  "DIFFERENT_MANUFACTURER",
  "DIFFERENT_CHARACTERISTICS",
  "TEEVO_INVENTORY",
  "DIFFERENT_GENERATION",
  "CONSUMER_FAMILIARITY",
  "CATALOGUE_KEY",
] as const;

/** One medium-versus-high reliability step. A low-reliability dimension is not comparable. */
const SUPPORT_STEP = 0.15;

export type DiversitySelectionReason =
  | "STRONGER_EVIDENCE"
  | "UK_MARKET_RELEVANCE"
  | "TEEVO_INVENTORY"
  | "DIFFERENT_MANUFACTURER"
  | "SAME_MANUFACTURER_ONLY_SUPPORTED_OPTION"
  | "DIFFERENT_CHARACTERISTICS"
  | "DIFFERENT_GENERATION"
  | "CONSUMER_FAMILIARITY"
  | "BRAND_FILTER"
  | "REMAINING_SUITABLE_HEAD"
  | "CATALOGUE_KEY";

export type DiversitySelection = {
  head: CatalogueHeadScore;
  reasons: DiversitySelectionReason[];
};

function hasLowReliability(head: CatalogueHeadScore): boolean {
  for (const name of CATALOGUE_HEAD_DIMENSIONS) {
    const trace = head.dimensions[name];
    if (trace?.active && trace.reliability > 0 && trace.reliability < MEDIUM_RELIABILITY) {
      return true;
    }
  }
  return false;
}

function manufacturerId(head: CatalogueHeadScore): string {
  return canonicalBrandId(head.brand) ?? head.catalogue_key;
}

function comparableSupport(candidate: CatalogueHeadScore, anchor: CatalogueHeadScore): boolean {
  if (hasLowReliability(candidate) && !hasLowReliability(anchor)) return false;
  return evidenceStrength(candidate) + 1e-9 >= evidenceStrength(anchor) - SUPPORT_STEP;
}

function diversityPool(
  heads: CatalogueHeadScore[],
  brandIds: ReadonlySet<string> | null | undefined
): { heads: CatalogueHeadScore[]; filtered: boolean } {
  if (!brandIds || brandIds.size === 0) return { heads, filtered: false };
  const matching = heads.filter((head) => {
    const id = canonicalBrandId(head.brand);
    return id != null && brandIds.has(id);
  });
  return { heads: matching, filtered: true };
}

function characteristicSignature(head: CatalogueHeadScore): string {
  const chars = head.presentation_chars;
  const parts: string[] = [];
  if (head.dimensions.direction?.active && chars?.directional_bias) {
    parts.push(`dir:${chars.directional_bias}`);
  }
  if (head.dimensions.head_launch?.active && chars?.launch_tendency) {
    parts.push(`launch:${chars.launch_tendency}`);
  }
  if (chars?.primary_head_profile) parts.push(`profile:${chars.primary_head_profile}`);
  return parts.join("|") || head.catalogue_key;
}

function compareSupported(
  a: CatalogueHeadScore,
  b: CatalogueHeadScore,
  uk: UkHeadRelevanceIndex | null | undefined,
  stock: ReadonlySet<string>
): number {
  const evidence = evidenceStrength(b) - evidenceStrength(a);
  if (evidence !== 0) return evidence;
  const market = ukRank(b, uk) - ukRank(a, uk);
  if (market !== 0) return market;
  const available = Number(stock.has(b.catalogue_key)) - Number(stock.has(a.catalogue_key));
  if (available !== 0) return available;
  const familiar = familiarityRank(a) - familiarityRank(b);
  if (familiar !== 0) return familiar;
  return a.catalogue_key.localeCompare(b.catalogue_key);
}

function selectionReasons(
  head: CatalogueHeadScore,
  selected: CatalogueHeadScore[],
  filtered: boolean,
  comparable: boolean
): DiversitySelectionReason[] {
  const reasons: DiversitySelectionReason[] = [];
  if (filtered) reasons.push("BRAND_FILTER");
  if (!comparable && selected.length > 0) {
    reasons.push("REMAINING_SUITABLE_HEAD");
    return reasons;
  }
  if (selected.length === 0) {
    reasons.push("STRONGER_EVIDENCE");
    return reasons;
  }
  if (!selected.some((prior) => manufacturerId(prior) === manufacturerId(head))) {
    reasons.push("DIFFERENT_MANUFACTURER");
  } else {
    reasons.push("SAME_MANUFACTURER_ONLY_SUPPORTED_OPTION");
  }
  if (selected.every((prior) => characteristicSignature(prior) !== characteristicSignature(head))) {
    reasons.push("DIFFERENT_CHARACTERISTICS");
  }
  return reasons;
}

/**
 * Choose up to `limit` heads from drivers that already share suitability.
 * A different manufacturer is preferred only when its evidence is comparable.
 * An explicit brand filter keeps that brand. It does not add a bonus to Fit.
 */
export function selectDiverseEquivalentHeads(input: {
  heads: CatalogueHeadScore[];
  uk?: UkHeadRelevanceIndex | null;
  inStockKeys?: ReadonlySet<string>;
  brandIds?: ReadonlySet<string> | null;
  alreadySelected?: CatalogueHeadScore[];
  limit?: number;
}): DiversitySelection[] {
  const limit = Math.max(0, input.limit ?? 3);
  if (input.heads.length === 0 || limit === 0) return [];
  const stock = input.inStockKeys ?? new Set<string>();
  const pooled = diversityPool(input.heads, input.brandIds);
  const sorted = [...pooled.heads].sort((a, b) => compareSupported(a, b, input.uk, stock));
  const anchor = input.alreadySelected?.[0] ?? sorted[0];
  const comparable = sorted.filter((head) => comparableSupport(head, anchor));
  const selected: DiversitySelection[] = [];
  const used = new Set((input.alreadySelected ?? []).map((head) => head.catalogue_key));
  const prior = [...(input.alreadySelected ?? [])];

  const take = (source: CatalogueHeadScore[], comparablePick: boolean) => {
    const pool = source.filter((head) => !used.has(head.catalogue_key));
    while (selected.length < limit && pool.length > 0) {
      let pick = 0;
      if (prior.length > 0) {
        let bestRank = Number.POSITIVE_INFINITY;
        pool.forEach((head, index) => {
          const sameBrand = prior.some((item) => manufacturerId(item) === manufacturerId(head));
          const sameProfile = prior.some(
            (item) => characteristicSignature(item) === characteristicSignature(head)
          );
          const sameGeneration = prior.some(
            (item) =>
              manufacturerId(item) === manufacturerId(head) &&
              item.release_year != null &&
              item.release_year === head.release_year
          );
          const rank = (sameBrand ? 100 : 0) + (sameProfile ? 10 : 0) + (sameGeneration ? 1 : 0);
          if (rank < bestRank) {
            bestRank = rank;
            pick = index;
          }
        });
      }
      const head = pool.splice(pick, 1)[0];
      used.add(head.catalogue_key);
      selected.push({
        head,
        reasons: selectionReasons(head, prior, pooled.filtered, comparablePick),
      });
      prior.push(head);
    }
  };

  take(comparable, true);
  if (selected.length < limit) take(sorted, false);
  return selected;
}

export function selectSuitableExamples(input: {
  topTier: CatalogueHeadScore[];
  uk: UkHeadRelevanceIndex | null | undefined;
  inStockKeys?: ReadonlySet<string>;
  brandIds?: ReadonlySet<string> | null;
  limit?: number;
}): CatalogueHeadScore[] {
  return selectDiverseEquivalentHeads({
    heads: input.topTier,
    uk: input.uk,
    inStockKeys: input.inStockKeys,
    brandIds: input.brandIds,
    limit: input.limit,
  }).map((item) => item.head);
}
