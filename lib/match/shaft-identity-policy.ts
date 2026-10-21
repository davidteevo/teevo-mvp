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

/**
 * Seller descriptions that match a frozen aftermarket alias and also name a
 * TaylorMade OEM build. Spaced and compact flex spellings are both included.
 */
export const PROTECTED_SHAFT_PHRASES: ReadonlySet<string> = new Set([
  "ventus blue 5s",
  "ventus blue 5 s",
  "fujikura ventus blue 5 s",
  "ventus blue 5r",
  "ventus blue 5 r",
  "fujikura ventus blue 5 r",
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
