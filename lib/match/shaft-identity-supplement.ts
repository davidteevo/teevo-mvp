import { readFileSync } from "fs";
import { join } from "path";
import type { ShaftRecord } from "./intelligence/load";
import { MATCH_SHAFT_IDENTITY_SUPPLEMENT_VERSION } from "./shaft-identity-policy";

export type ShaftIdentitySupplementResult = {
  ok: boolean;
  reason: string | null;
  identities: ShaftRecord[];
};

const REQUIRED_TEXT = [
  "shaft_key",
  "manufacturer",
  "oem_brand",
  "model",
  "display_name",
  "generation",
  "flex",
  "aliases",
  "source_1_url",
] as const;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Validate an identity supplement. Shared commercial aliases are allowed.
 * A bad version, a duplicate canonical key, or a malformed identity rejects
 * the whole supplement. Callers must keep the protected-phrase guard active
 * when this returns ok: false.
 */
export function validateShaftIdentitySupplement(
  parsed: unknown,
  frozenShafts: ReadonlyArray<{ shaft_key?: string | null }>
): ShaftIdentitySupplementResult {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, reason: "MALFORMED_SUPPLEMENT", identities: [] };
  }
  const body = parsed as Record<string, unknown>;
  if (body.supplement_version !== MATCH_SHAFT_IDENTITY_SUPPLEMENT_VERSION) {
    return { ok: false, reason: "SUPPLEMENT_VERSION_REJECTED", identities: [] };
  }
  if (!Array.isArray(body.identities)) {
    return { ok: false, reason: "MALFORMED_SUPPLEMENT", identities: [] };
  }

  const frozenKeys = new Set(
    frozenShafts
      .map((row) => row.shaft_key)
      .filter((key): key is string => typeof key === "string" && key.length > 0)
  );
  const seen = new Set<string>();
  const identities: ShaftRecord[] = [];

  for (const row of body.identities) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      return { ok: false, reason: "MALFORMED_IDENTITY", identities: [] };
    }
    const identity = row as ShaftRecord;
    for (const field of REQUIRED_TEXT) {
      if (!text(identity[field])) {
        return { ok: false, reason: "MALFORMED_IDENTITY", identities: [] };
      }
    }
    if (identity.match_eligibility !== "RECOGNITION_ONLY") {
      return { ok: false, reason: "MALFORMED_IDENTITY", identities: [] };
    }
    if (identity.intelligence_version !== MATCH_SHAFT_IDENTITY_SUPPLEMENT_VERSION) {
      return { ok: false, reason: "MALFORMED_IDENTITY", identities: [] };
    }
    const weight = identity.actual_weight_g;
    if (weight != null && (typeof weight !== "number" || !Number.isFinite(weight))) {
      return { ok: false, reason: "MALFORMED_IDENTITY", identities: [] };
    }
    const key = text(identity.shaft_key);
    if (seen.has(key) || frozenKeys.has(key)) {
      return { ok: false, reason: "DUPLICATE_CANONICAL_KEY", identities: [] };
    }
    seen.add(key);
    identities.push(identity);
  }

  return { ok: true, reason: null, identities };
}

export function loadShaftIdentitySupplement(
  referenceDirectory: string,
  frozenShafts: ReadonlyArray<{ shaft_key?: string | null }>
): ShaftIdentitySupplementResult {
  try {
    const parsed = JSON.parse(
      readFileSync(
        join(referenceDirectory, "shaft-identity-supplement.v1.json"),
        "utf8"
      )
    ) as unknown;
    return validateShaftIdentitySupplement(parsed, frozenShafts);
  } catch {
    return { ok: false, reason: "SUPPLEMENT_UNAVAILABLE", identities: [] };
  }
}
