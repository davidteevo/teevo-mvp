import { readFileSync } from "fs";
import { join } from "path";
import {
  buildBrandRegistry,
  canonicalBrandId,
  type BrandRegistry,
} from "../brands";
import { deepFreezeRecord } from "../util";

export type HeadRecord = {
  catalogue_key?: string;
  intelligence_version?: string;
  match_eligible?: string;
  driver_subtype?: string;
  category?: string;
  brand?: string;
  model?: string;
  display_name?: string;
  aliases?: string;
  Aliases?: string;
  Brand?: string;
  Model?: string;
  rules_conformity?: string;
  [key: string]: unknown;
};

export type ShaftRecord = {
  shaft_key?: string | null;
  match_eligibility?: string;
  manufacturer?: string;
  Brand?: string;
  model?: string;
  Model?: string;
  display_name?: string;
  aliases?: string;
  family?: string;
  flex?: string;
  weight_class?: string;
  actual_weight_g?: unknown;
  [key: string]: unknown;
};

export type ReadonlyHeadRecord = Readonly<HeadRecord>;
export type ReadonlyShaftRecord = Readonly<ShaftRecord>;

export type MatchIntelligence = {
  readonly heads: ReadonlyArray<ReadonlyHeadRecord>;
  readonly shafts: ReadonlyArray<ReadonlyShaftRecord>;
  readonly headsByKey: Readonly<Record<string, ReadonlyHeadRecord>>;
  readonly shaftsByKey: Readonly<Record<string, ReadonlyShaftRecord>>;
  readonly eligibleHeads: ReadonlyArray<ReadonlyHeadRecord>;
  readonly matchEligibleShafts: ReadonlyArray<ReadonlyShaftRecord>;
  /** Canonical head-brand registry from the full frozen head universe. */
  readonly brandRegistry: BrandRegistry;
};

function parseTable(raw: unknown[]): Record<string, unknown>[] {
  if (!Array.isArray(raw) || raw.length < 2 || !Array.isArray(raw[0])) {
    throw new Error("Frozen catalogue must be [header, ...rows]");
  }
  const cols = raw[0] as string[];
  return raw.slice(1).map((row) => {
    const r = row as unknown[];
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < cols.length; i++) {
      obj[cols[i]] = r[i] === undefined ? null : r[i];
    }
    return obj;
  });
}

function isEligibleHead(h: HeadRecord): boolean {
  return (
    h.intelligence_version === "DRIVER_V1" &&
    String(h.match_eligible).toUpperCase() === "TRUE" &&
    String(h.driver_subtype || "").toUpperCase() === "STANDARD" &&
    String(h.category || "").toUpperCase() === "DRIVER" &&
    String(h.rules_conformity || "").toUpperCase() !== "NON_CONFORMING"
  );
}

/** Immutable load of frozen reference extracts. Does not mutate source files. */
export function loadMatchIntelligence(
  referenceDirectory: string
): MatchIntelligence {
  const headsRaw = JSON.parse(
    readFileSync(join(referenceDirectory, "heads.json"), "utf8")
  ) as unknown[];
  const shaftsRaw = JSON.parse(
    readFileSync(join(referenceDirectory, "shafts.json"), "utf8")
  ) as unknown[];

  const frozenHeads: ReadonlyHeadRecord[] = parseTable(headsRaw).map((h) =>
    deepFreezeRecord(h as HeadRecord)
  );
  const frozenShafts: ReadonlyShaftRecord[] = parseTable(shaftsRaw).map((s) =>
    deepFreezeRecord(s as ShaftRecord)
  );

  const headsByKey: Record<string, ReadonlyHeadRecord> = {};
  for (const h of frozenHeads) {
    const key = h.catalogue_key;
    if (typeof key === "string" && key) headsByKey[key] = h;
  }
  const shaftsByKey: Record<string, ReadonlyShaftRecord> = {};
  for (const s of frozenShafts) {
    const key = s.shaft_key;
    if (typeof key === "string" && key) shaftsByKey[key] = s;
  }

  const eligibleHeads = frozenHeads.filter(isEligibleHead);
  const matchEligibleShafts = frozenShafts.filter(
    (s) => s.match_eligibility === "MATCH_ELIGIBLE" && !!s.shaft_key
  );
  const brandRegistry = buildBrandRegistry(frozenHeads);

  return Object.freeze({
    heads: Object.freeze(frozenHeads),
    shafts: Object.freeze(frozenShafts),
    headsByKey: Object.freeze(headsByKey),
    shaftsByKey: Object.freeze(shaftsByKey),
    eligibleHeads: Object.freeze(eligibleHeads),
    matchEligibleShafts: Object.freeze(matchEligibleShafts),
    brandRegistry,
  });
}

export function canonicalHeadBrandId(
  head: ReadonlyHeadRecord | undefined
): string | undefined {
  const brand = head?.brand ?? head?.Brand;
  if (typeof brand !== "string") return undefined;
  return canonicalBrandId(brand) ?? undefined;
}
