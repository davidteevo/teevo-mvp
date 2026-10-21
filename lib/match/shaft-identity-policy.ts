/**
 * Fail-closed shaft identity policy for commercial names that are shared by
 * more than one physical shaft.
 *
 * Safe rollback is to remove or replace shaft-identity-supplement.v1.json
 * while leaving this phrase list in place. Removing this list would restore
 * unique aftermarket matches for the protected seller descriptions.
 */
export const MATCH_SHAFT_IDENTITY_SUPPLEMENT_VERSION =
  "SHAFT_IDENTITY_SUPPLEMENT_V1" as const;

export function normaliseShaftPhrase(value: unknown): string {
  if (value == null) return "";
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type VelocoreTechnology = "plus" | "original" | "unspecified";

/**
 * Read VeloCore+ before generic normalisation removes "+".
 * "VeloCore+" and "VeloCore Plus" are the plus generation.
 * "VeloCore" without either marker is the original generation.
 */
export function velocoreTechnology(value: unknown): VelocoreTechnology {
  const raw = String(value ?? "");
  if (!/velocore/i.test(raw)) return "unspecified";
  if (/velocore\s*\+/i.test(raw) || /velocore\s+plus\b/i.test(raw)) {
    return "plus";
  }
  return "original";
}

/**
 * Ventus generation marker. VeloCore+ / VeloCore Plus, and the Ventus TR
 * seller form "TR Black+", "TR Blue+", or "TR Red+", are the plus generation.
 * Original VeloCore, and TR color names without that plus, are not.
 */
function labelGeneration(value: unknown): VelocoreTechnology {
  if (velocoreTechnology(value) === "plus") return "plus";
  const raw = String(value ?? "");
  const ventusTrPlus =
    /ventus/i.test(raw) && /\btr\s+(black|blue|red)\s*\+/i.test(raw);
  if (ventusTrPlus) return "plus";
  if (velocoreTechnology(value) === "original") return "original";
  if (/ventus/i.test(raw) && /\btr\s+(black|blue|red)\b/i.test(raw)) {
    return "original";
  }
  return "unspecified";
}

function canonicalGeneration(value: unknown): string {
  const marked = String(value ?? "")
    .toLowerCase()
    .replace(/velocore\s*\+/g, " velocoreplus ")
    .replace(/velocore\s+plus\b/g, " velocoreplus ")
    .replace(/\btr\s+(black|blue|red)\s*\+/g, " tr $1 plus ");
  return normaliseShaftPhrase(marked);
}

/**
 * Compare two shaft labels without letting a plus generation equal the
 * original generation. Generic normalisation is unchanged and is used only
 * when neither label names one of these Ventus generations.
 */
export function shaftLabelsMatch(left: unknown, right: unknown): boolean {
  const leftTech = labelGeneration(left);
  const rightTech = labelGeneration(right);
  if (leftTech === "plus" || rightTech === "plus") {
    if (leftTech !== "plus" || rightTech !== "plus") return false;
    const canonical = canonicalGeneration(left);
    return canonical !== "" && canonical === canonicalGeneration(right);
  }
  if (leftTech === "original" || rightTech === "original") {
    if (leftTech !== "original" || rightTech !== "original") return false;
    const phrase = normaliseShaftPhrase(left);
    return phrase !== "" && phrase === normaliseShaftPhrase(right);
  }
  const phrase = normaliseShaftPhrase(left);
  return phrase !== "" && phrase === normaliseShaftPhrase(right);
}

export function sellerVelocoreTechnology(evidence: {
  shaft?: string | null;
  display_name?: string | null;
  model?: string | null;
}): VelocoreTechnology | "conflict" {
  const techs = [evidence.shaft, evidence.display_name, evidence.model].map(
    velocoreTechnology
  );
  const names = techs.filter((tech) => tech !== "unspecified");
  if (names.includes("plus") && names.includes("original")) return "conflict";
  if (names.includes("plus")) return "plus";
  if (names.includes("original")) return "original";
  return "unspecified";
}

/**
 * Seller descriptions that cannot distinguish an OEM build from an aftermarket
 * shaft. Spaced, compact, and hyphenated flex spellings are included.
 *
 * Ventus Blue 6 S is protected from Fujikura's OEM stock example
 * (https://fujikuragolf.com/oem-shafts/): the aftermarket photo is marked
 * VENTUS 6-S and VELOCORE, and the OEM photo is marked VENTUS 6-S without
 * VELOCORE. No OEM driver identity is added. TaylorMade's 2021 VENTUS Blue
 * 6 FW row is a fairway shaft, not this driver description. VeloCore and
 * VeloCore+ labels stay outside this set.
 */
export const PROTECTED_SHAFT_PHRASES: ReadonlySet<string> = new Set([
  "ventus blue 5s",
  "ventus blue 5 s",
  "fujikura ventus blue 5 s",
  "ventus blue 5r",
  "ventus blue 5 r",
  "fujikura ventus blue 5 r",
  "ventus blue 6s",
  "ventus blue 6 s",
  "fujikura ventus blue 6 s",
  "fujikura ventus blue 6s",
  "kuro kage silver 60 r",
  "mitsubishi kuro kage silver 60 r",
  "kurokage silver 60 r",
  "kuro kage silver 60 s",
  "mitsubishi kuro kage silver 60 s",
  "kurokage silver 60 s",
  "kuro kage silver 60 x",
  "mitsubishi kuro kage silver 60 x",
  "kurokage silver 60 x",
]);

export function isProtectedShaftPhrase(value: unknown): boolean {
  const phrase = normaliseShaftPhrase(value);
  return phrase !== "" && PROTECTED_SHAFT_PHRASES.has(phrase);
}

/**
 * Published OEM and aftermarket weights within 1 g. Grams in this range are
 * not treated as conclusive identity evidence unless a generation is supplied.
 */
export const NOMINAL_WEIGHT_OVERLAPS: readonly {
  aftermarketKey: string;
  oemWeightG: number;
  toleranceG: number;
}[] = [
  {
    aftermarketKey: "mitsubishi-chemical|kuro-kage-silver|2013|60|r",
    oemWeightG: 64,
    toleranceG: 1,
  },
  {
    aftermarketKey: "mitsubishi-chemical|kuro-kage-silver|2013|60|s",
    oemWeightG: 67,
    toleranceG: 1,
  },
  {
    aftermarketKey: "mitsubishi-chemical|kuro-kage-silver|2013|60|x",
    oemWeightG: 69,
    toleranceG: 1,
  },
];

export function nominalWeightOverlapsOem(
  shaftKey: string,
  weightG: number
): boolean {
  const rule = NOMINAL_WEIGHT_OVERLAPS.find(
    (row) => row.aftermarketKey === shaftKey
  );
  if (!rule) return false;
  return Math.abs(weightG - rule.oemWeightG) <= rule.toleranceG;
}
