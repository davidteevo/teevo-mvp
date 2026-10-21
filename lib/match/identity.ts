import type {
  ReadonlyHeadRecord,
  ReadonlyShaftRecord,
} from "./intelligence/load";
import {
  isProtectedShaftPhrase,
  nominalWeightOverlapsOem,
  normaliseShaftPhrase,
  sellerVelocoreTechnology,
  shaftLabelsMatch,
  velocoreTechnology,
} from "./shaft-identity-policy";
import { firstMapValue } from "./util";

export type IdentityMatch = {
  key: string;
  eligibility: string;
};

export type IdentityResolution = {
  resolved_key: string | null;
  eligible: boolean;
  reason: string | null;
};

export type HeadIdentityEvidence = {
  catalogue_key?: string | null;
  brand?: string | null;
  model?: string | null;
  display_name?: string | null;
};

export type ShaftIdentityEvidence = {
  shaft_key?: string | null;
  shaft?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  display_name?: string | null;
  flex?: string | null;
  actual_weight_g?: number | null;
  generation?: string | null;
};

/**
 * Resolve against the full match set already collected from the reference universe.
 * Do not pre-filter to MATCH_ELIGIBLE before calling this.
 */
export function resolveIdentity(
  matches: IdentityMatch[]
): IdentityResolution {
  const byKey = new Map<string, IdentityMatch>();
  for (const m of matches) {
    if (!byKey.has(m.key)) byKey.set(m.key, m);
  }
  if (byKey.size === 0) {
    return {
      resolved_key: null,
      eligible: false,
      reason: "UNRESOLVED_IDENTITY",
    };
  }
  if (byKey.size > 1) {
    return {
      resolved_key: null,
      eligible: false,
      reason: "AMBIGUOUS_IDENTITY",
    };
  }
  const only = firstMapValue(byKey)!;
  const eligible = only.eligibility === "MATCH_ELIGIBLE";
  return {
    resolved_key: only.key,
    eligible,
    reason: eligible ? null : "INELIGIBLE_IDENTITY",
  };
}

function norm(value: unknown): string {
  return normaliseShaftPhrase(value);
}

function splitAliases(val: unknown): string[] {
  if (val == null || val === "") return [];
  return String(val)
    .split(/[|;,/]+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function headEligibility(h: ReadonlyHeadRecord): string {
  if (
    h.intelligence_version === "DRIVER_V1" &&
    String(h.match_eligible).toUpperCase() === "TRUE" &&
    String(h.driver_subtype || "").toUpperCase() === "STANDARD" &&
    String(h.category || "").toUpperCase() === "DRIVER" &&
    String(h.rules_conformity || "").toUpperCase() !== "NON_CONFORMING"
  ) {
    return "MATCH_ELIGIBLE";
  }
  if (String(h.driver_subtype || "").toUpperCase() === "MINI") {
    return "EXCLUDED_SCOPE";
  }
  if (
    h.intelligence_version === "DRIVER_V1" &&
    String(h.match_eligible).toUpperCase() === "FALSE"
  ) {
    return "RECOGNITION_ONLY";
  }
  return "RECOGNITION_ONLY";
}

/**
 * Collect identity hits from the full head reference universe (including
 * ineligible / recognition-only rows) using keys, brand/model and aliases.
 */
export function collectHeadIdentityMatches(
  evidence: HeadIdentityEvidence,
  heads: ReadonlyArray<ReadonlyHeadRecord>
): IdentityMatch[] {
  const matches: IdentityMatch[] = [];
  const seen = new Set<string>();
  const push = (h: ReadonlyHeadRecord) => {
    const key = h.catalogue_key;
    if (typeof key !== "string" || !key || seen.has(key)) return;
    seen.add(key);
    matches.push({ key, eligibility: headEligibility(h) });
  };

  const key = evidence.catalogue_key?.trim();
  if (key) {
    for (const h of heads) {
      if (h.catalogue_key === key) push(h);
    }
  }

  const brand = norm(evidence.brand);
  const model = norm(evidence.model);
  const display = norm(evidence.display_name);
  const phrases = new Set<string>();
  if (model) phrases.add(model);
  if (brand && model) phrases.add(norm(`${brand} ${model}`));
  if (display) phrases.add(display);

  for (const h of heads) {
    if (!h.catalogue_key) continue;
    const hBrand = norm(h.brand ?? h.Brand);
    const hModel = norm(h.model ?? h.Model);
    if (brand && model && hBrand === brand && hModel === model) {
      push(h);
      continue;
    }
    const hDisplay = norm(h.display_name);
    if (display && hDisplay && display === hDisplay) {
      push(h);
      continue;
    }
    const aliases = [
      ...splitAliases(h.aliases),
      ...splitAliases(h.Aliases),
    ].map(norm);
    for (const ph of Array.from(phrases)) {
      if (aliases.includes(ph)) {
        push(h);
        break;
      }
    }
  }

  return matches;
}

/**
 * Collect shaft identity hits from the full shaft reference universe before
 * eligibility filtering. Bare brand+model alone does not invent flex/weight.
 */
export function collectShaftIdentityMatches(
  evidence: ShaftIdentityEvidence,
  shafts: ReadonlyArray<ReadonlyShaftRecord>
): IdentityMatch[] {
  const matches: IdentityMatch[] = [];
  const seen = new Set<string>();
  const push = (s: ReadonlyShaftRecord) => {
    const key = s.shaft_key;
    if (typeof key !== "string" || !key || seen.has(key)) return;
    seen.add(key);
    matches.push({
      key,
      eligibility: String(s.match_eligibility || "RECOGNITION_ONLY"),
    });
  };

  const exactKey = evidence.shaft_key?.trim();
  if (exactKey) {
    for (const s of shafts) {
      if (s.shaft_key === exactKey) push(s);
    }
  }

  const rawPhrases = [evidence.shaft, evidence.display_name].filter(
    (value): value is string => typeof value === "string" && value.trim() !== ""
  );

  const manuf = norm(evidence.manufacturer);
  const model = norm(evidence.model);
  const flex = norm(evidence.flex);
  const weight =
    evidence.actual_weight_g != null && Number.isFinite(evidence.actual_weight_g)
      ? String(evidence.actual_weight_g)
      : "";

  for (const s of shafts) {
    if (!s.shaft_key) continue;
    const labels = [s.display_name, ...splitAliases(s.aliases)];
    if (rawPhrases.some((phrase) => labels.some((label) => shaftLabelsMatch(phrase, label)))) {
      push(s);
    }

    // Explicit multi-field exactness may uniquely identify a variant.
    // Model comparison keeps VeloCore and VeloCore+ apart.
    if (manuf && model && flex && weight) {
      const sManuf = norm(s.manufacturer ?? s.Brand);
      const sFlex = norm(s.flex);
      const sWeight =
        s.actual_weight_g != null && Number.isFinite(Number(s.actual_weight_g))
          ? String(Number(s.actual_weight_g))
          : "";
      if (
        sManuf === manuf &&
        shaftLabelsMatch(evidence.model, s.model ?? s.Model) &&
        sFlex === flex &&
        sWeight === weight
      ) {
        push(s);
      }
    }
  }

  return matches;
}

export function resolveHeadIdentity(
  evidence: HeadIdentityEvidence,
  heads: ReadonlyArray<ReadonlyHeadRecord>
): IdentityResolution {
  return resolveIdentity(collectHeadIdentityMatches(evidence, heads));
}

const AMBIGUOUS: IdentityResolution = {
  resolved_key: null,
  eligible: false,
  reason: "AMBIGUOUS_IDENTITY",
};

export function resolveShaftIdentity(
  evidence: ShaftIdentityEvidence,
  shafts: ReadonlyArray<ReadonlyShaftRecord>
): IdentityResolution {
  const collected = collectShaftIdentityMatches(evidence, shafts);
  const generation = norm(evidence.generation);
  const weight = evidence.actual_weight_g;
  let removedOverlap = false;
  const matches = collected.filter((match) => {
    if (weight == null || !Number.isFinite(weight)) return true;
    if (!nominalWeightOverlapsOem(match.key, weight)) return true;
    const shaft = shafts.find((row) => row.shaft_key === match.key);
    if (generation && shaft && norm(shaft.generation) === generation) return true;
    removedOverlap = true;
    return false;
  });
  if (removedOverlap && matches.length === 0) return AMBIGUOUS;

  const sellerTech = sellerVelocoreTechnology(evidence);
  if (sellerTech === "conflict") return AMBIGUOUS;
  if (sellerTech === "original") {
    const originalMatches = matches.filter((match) => {
      const shaft = shafts.find((row) => row.shaft_key === match.key);
      if (!shaft) return false;
      const labels = [shaft.display_name, ...splitAliases(shaft.aliases)];
      return (
        labels.some((label) => velocoreTechnology(label) === "original") &&
        !labels.some((label) => velocoreTechnology(label) === "plus")
      );
    });
    if (
      originalMatches.length === 1 &&
      matches.length === originalMatches.length
    ) {
      return resolveIdentity(originalMatches);
    }
    return AMBIGUOUS;
  }

  const resolution = resolveIdentity(matches);
  const protectedPhrase =
    isProtectedShaftPhrase(evidence.shaft) ||
    isProtectedShaftPhrase(evidence.display_name);
  if (!protectedPhrase) return resolution;

  const eligible = matches.some((match) => match.eligibility === "MATCH_ELIGIBLE");
  const recognition = matches.some(
    (match) => match.eligibility !== "MATCH_ELIGIBLE"
  );
  if (eligible && recognition) return resolution;
  return AMBIGUOUS;
}
