import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { MatchIntelligence, ShaftRecord } from "./intelligence/load";
import {
  MATCH_HEADS_VERSION,
  MATCH_SHAFTS_VERSION,
} from "./versions";

export const MATCH_OEM_DRIVER_CONFIGS_VERSION =
  "MATCH_OEM_DRIVER_CONFIGS_V1" as const;

export const OEM_OFFERING_VERIFICATION_STATUSES = [
  "VERIFIED_OFFERING",
  "INCOMPLETE_OFFERING_EVIDENCE",
] as const;

export const OEM_SHAFT_IDENTITY_STATUSES = [
  "RESOLVED_MATCH_ELIGIBLE",
  "RECOGNITION_ONLY",
  "EXCLUDED_SCOPE",
  "QUARANTINED",
  "UNRESOLVED",
  "AFTERMARKET_COLLISION_BLOCKED",
] as const;

export const OEM_OFFERING_TYPES = [
  "STOCK",
  "OPTIONAL_OEM",
  "CUSTOM_ORDER",
] as const;

export const OEM_MARKET_SCOPES = ["UK_EU", "US", "GLOBAL", "UNKNOWN"] as const;

export const OEM_HANDEDNESS_SCOPES = ["RH", "LH", "BOTH", "UNKNOWN"] as const;

export const OEM_CONFIGURATION_COMPLETENESS = [
  "OFFERING_ONLY",
  "PARTIAL_CONFIGURATION",
  "VERIFIED_COMPLETE_CONFIGURATION",
] as const;

export type OemOfferingVerificationStatus =
  (typeof OEM_OFFERING_VERIFICATION_STATUSES)[number];
export type OemShaftIdentityStatus =
  (typeof OEM_SHAFT_IDENTITY_STATUSES)[number];
export type OemOfferingType = (typeof OEM_OFFERING_TYPES)[number];
export type OemMarketScope = (typeof OEM_MARKET_SCOPES)[number];
export type OemHandednessScope = (typeof OEM_HANDEDNESS_SCOPES)[number];
export type OemConfigurationCompleteness =
  (typeof OEM_CONFIGURATION_COMPLETENESS)[number];

export type OemDriverConfigOffering = {
  offering_id: string;
  offering_verification_status: OemOfferingVerificationStatus;
  shaft_identity_status: OemShaftIdentityStatus;
  named_option_eligible: boolean;
  configuration_completeness: OemConfigurationCompleteness;
  shaft_key: string | null;
  shaft_evidence_label: string;
  shaft_manufacturer: string;
  shaft_model: string;
  flex_label: string | null;
  weight_g: number | null;
  weight_class_label: string | null;
  launch_label: string | null;
  oem_offering_type: OemOfferingType;
  market_scope: OemMarketScope;
  loft_options_deg: number[] | null;
  handedness_scope: OemHandednessScope;
  candidate_aftermarket_keys_not_used: string[];
  source_url: string;
  source_title: string;
  evidence_description: string;
  evidence_date: string;
  identity_gap_notes: string | null;
};

export type OemDriverConfigMember = {
  catalogue_key: string;
  display_name: string;
  uk_config_relevance: string;
  research_status: "RESEARCHED" | "PARTIAL";
  evidenced_head_lofts_deg: number[] | null;
  evidenced_head_lofts_scope:
    | "HEAD_CATALOGUE_OPTIONS"
    | "MANUFACTURER_LISTING"
    | "UNKNOWN";
  evidenced_handedness_scope: OemHandednessScope;
  offerings: OemDriverConfigOffering[];
};

export type OemDriverConfigsFile = {
  overlay_version: typeof MATCH_OEM_DRIVER_CONFIGS_VERSION;
  intelligence_heads_ref: string;
  intelligence_shafts_ref: string;
  contract_version: string;
  members: OemDriverConfigMember[];
};

export type OemDriverConfigsIndex = {
  version: typeof MATCH_OEM_DRIVER_CONFIGS_VERSION;
  intelligence_heads_ref: string;
  intelligence_shafts_ref: string;
  contract_version: string;
  byCatalogueKey: ReadonlyMap<string, OemDriverConfigMember>;
  namedOfferingsByCatalogueKey: ReadonlyMap<
    string,
    readonly OemDriverConfigOffering[]
  >;
  offeringIds: ReadonlySet<string>;
};

const OVERLAY_FILENAME = "oem-driver-configs.v1.json";

function isOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[]
): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

function isNumberArrayOrNull(value: unknown): value is number[] | null {
  if (value === null) return true;
  return (
    Array.isArray(value) &&
    value.every((entry) => typeof entry === "number" && Number.isFinite(entry))
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isOffering(raw: unknown): raw is OemDriverConfigOffering {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return (
    typeof o.offering_id === "string" &&
    !!o.offering_id &&
    isOneOf(o.offering_verification_status, OEM_OFFERING_VERIFICATION_STATUSES) &&
    isOneOf(o.shaft_identity_status, OEM_SHAFT_IDENTITY_STATUSES) &&
    typeof o.named_option_eligible === "boolean" &&
    isOneOf(o.configuration_completeness, OEM_CONFIGURATION_COMPLETENESS) &&
    (o.shaft_key === null || typeof o.shaft_key === "string") &&
    typeof o.shaft_evidence_label === "string" &&
    !!o.shaft_evidence_label &&
    typeof o.shaft_manufacturer === "string" &&
    !!o.shaft_manufacturer &&
    typeof o.shaft_model === "string" &&
    !!o.shaft_model &&
    (o.flex_label === null || typeof o.flex_label === "string") &&
    (o.weight_g === null ||
      (typeof o.weight_g === "number" && Number.isFinite(o.weight_g))) &&
    (o.weight_class_label === null || typeof o.weight_class_label === "string") &&
    (o.launch_label === null || typeof o.launch_label === "string") &&
    isOneOf(o.oem_offering_type, OEM_OFFERING_TYPES) &&
    isOneOf(o.market_scope, OEM_MARKET_SCOPES) &&
    isNumberArrayOrNull(o.loft_options_deg) &&
    isOneOf(o.handedness_scope, OEM_HANDEDNESS_SCOPES) &&
    isStringArray(o.candidate_aftermarket_keys_not_used) &&
    typeof o.source_url === "string" &&
    typeof o.source_title === "string" &&
    typeof o.evidence_description === "string" &&
    typeof o.evidence_date === "string" &&
    (o.identity_gap_notes === null || typeof o.identity_gap_notes === "string")
  );
}

function isMember(raw: unknown): raw is OemDriverConfigMember {
  if (!raw || typeof raw !== "object") return false;
  const m = raw as Record<string, unknown>;
  return (
    typeof m.catalogue_key === "string" &&
    !!m.catalogue_key &&
    typeof m.display_name === "string" &&
    !!m.display_name &&
    typeof m.uk_config_relevance === "string" &&
    !!m.uk_config_relevance &&
    (m.research_status === "RESEARCHED" || m.research_status === "PARTIAL") &&
    isNumberArrayOrNull(m.evidenced_head_lofts_deg) &&
    (m.evidenced_head_lofts_scope === "HEAD_CATALOGUE_OPTIONS" ||
      m.evidenced_head_lofts_scope === "MANUFACTURER_LISTING" ||
      m.evidenced_head_lofts_scope === "UNKNOWN") &&
    isOneOf(m.evidenced_handedness_scope, OEM_HANDEDNESS_SCOPES) &&
    Array.isArray(m.offerings) &&
    m.offerings.every(isOffering)
  );
}

function shaftEligibility(shaft: ShaftRecord): string {
  return String(shaft.match_eligibility ?? "").toUpperCase();
}

function assertNamedOptionRules(offering: OemDriverConfigOffering): void {
  // Named options require a verified UK/EU offering with a uniquely resolved
  // MATCH_ELIGIBLE shaft. Researchers may still withhold naming while reviewing.
  const namedAllowed =
    offering.offering_verification_status === "VERIFIED_OFFERING" &&
    offering.shaft_identity_status === "RESOLVED_MATCH_ELIGIBLE" &&
    typeof offering.shaft_key === "string" &&
    offering.shaft_key.length > 0 &&
    offering.market_scope === "UK_EU";

  if (offering.named_option_eligible && !namedAllowed) {
    throw new Error(
      `offering ${offering.offering_id} claims named_option_eligible without a verified UK/EU MATCH_ELIGIBLE shaft`
    );
  }
}

function assertCompleteConfigurationRules(
  offering: OemDriverConfigOffering
): void {
  if (offering.configuration_completeness !== "VERIFIED_COMPLETE_CONFIGURATION") {
    return;
  }
  if (
    !offering.loft_options_deg ||
    offering.loft_options_deg.length === 0 ||
    offering.handedness_scope === "UNKNOWN" ||
    offering.offering_verification_status !== "VERIFIED_OFFERING" ||
    offering.shaft_identity_status !== "RESOLVED_MATCH_ELIGIBLE" ||
    !offering.shaft_key
  ) {
    throw new Error(
      `offering ${offering.offering_id} claims VERIFIED_COMPLETE_CONFIGURATION without loft, handedness, and resolved MATCH_ELIGIBLE shaft evidence`
    );
  }
}

function assertIdentityConsistency(
  offering: OemDriverConfigOffering,
  shaftsByKey: MatchIntelligence["shaftsByKey"]
): void {
  const status = offering.shaft_identity_status;

  if (status === "UNRESOLVED" || status === "AFTERMARKET_COLLISION_BLOCKED") {
    if (offering.shaft_key !== null) {
      throw new Error(
        `offering ${offering.offering_id} has ${status} but sets shaft_key`
      );
    }
    if (offering.named_option_eligible) {
      throw new Error(
        `offering ${offering.offering_id} cannot be named with ${status}`
      );
    }
    return;
  }

  if (offering.shaft_key === null || !offering.shaft_key) {
    throw new Error(
      `offering ${offering.offering_id} status ${status} requires shaft_key`
    );
  }

  const shaft = shaftsByKey[offering.shaft_key];
  if (!shaft) {
    throw new Error(
      `offering ${offering.offering_id} references unknown shaft_key: ${offering.shaft_key}`
    );
  }

  const eligibility = shaftEligibility(shaft);
  if (status === "RESOLVED_MATCH_ELIGIBLE") {
    if (eligibility !== "MATCH_ELIGIBLE") {
      throw new Error(
        `offering ${offering.offering_id} claims RESOLVED_MATCH_ELIGIBLE but shaft is ${eligibility}`
      );
    }
    const oemVariant = String(shaft.oem_variant ?? "").toUpperCase();
    if (oemVariant === "AFTERMARKET") {
      throw new Error(
        `offering ${offering.offering_id} cannot resolve AFTERMARKET shaft ${offering.shaft_key} as OEM offering identity`
      );
    }
  } else if (status === "RECOGNITION_ONLY") {
    if (eligibility !== "RECOGNITION_ONLY") {
      throw new Error(
        `offering ${offering.offering_id} claims RECOGNITION_ONLY but shaft is ${eligibility}`
      );
    }
    if (offering.named_option_eligible) {
      throw new Error(
        `offering ${offering.offering_id} recognition-only shaft cannot be named`
      );
    }
  } else if (status === "EXCLUDED_SCOPE" || status === "QUARANTINED") {
    if (eligibility !== status) {
      throw new Error(
        `offering ${offering.offering_id} claims ${status} but shaft is ${eligibility}`
      );
    }
    if (offering.named_option_eligible) {
      throw new Error(
        `offering ${offering.offering_id} ${status} shaft cannot be named`
      );
    }
  }

  for (const key of offering.candidate_aftermarket_keys_not_used) {
    if (!shaftsByKey[key]) {
      throw new Error(
        `offering ${offering.offering_id} candidate_aftermarket_keys_not_used unknown: ${key}`
      );
    }
  }
}

function assertEvidenceCompleteness(offering: OemDriverConfigOffering): void {
  if (offering.offering_verification_status !== "VERIFIED_OFFERING") {
    return;
  }
  if (!offering.source_url.trim() || !offering.source_title.trim()) {
    throw new Error(
      `offering ${offering.offering_id} VERIFIED_OFFERING requires source_url and source_title`
    );
  }
  if (!offering.evidence_description.trim() || !offering.evidence_date.trim()) {
    throw new Error(
      `offering ${offering.offering_id} VERIFIED_OFFERING requires evidence_description and evidence_date`
    );
  }
  if (offering.market_scope === "UNKNOWN") {
    throw new Error(
      `offering ${offering.offering_id} VERIFIED_OFFERING cannot use UNKNOWN market_scope`
    );
  }
}

/**
 * Validate a parsed OEM driver-config overlay against frozen intelligence.
 * Fail closed on version, identity, evidence, or naming-rule violations.
 */
export function validateOemDriverConfigs(
  raw: unknown,
  intelligence: Pick<MatchIntelligence, "headsByKey" | "shaftsByKey">
): OemDriverConfigsIndex {
  if (!raw || typeof raw !== "object") {
    throw new Error("oem-driver-configs overlay must be an object");
  }
  const file = raw as Record<string, unknown>;
  if (file.overlay_version !== MATCH_OEM_DRIVER_CONFIGS_VERSION) {
    throw new Error(
      `Unsupported oem-driver-configs overlay version: ${String(file.overlay_version)}`
    );
  }
  if (file.intelligence_heads_ref !== MATCH_HEADS_VERSION) {
    throw new Error(
      `oem-driver-configs intelligence_heads_ref mismatch: ${String(file.intelligence_heads_ref)}`
    );
  }
  if (file.intelligence_shafts_ref !== MATCH_SHAFTS_VERSION) {
    throw new Error(
      `oem-driver-configs intelligence_shafts_ref mismatch: ${String(file.intelligence_shafts_ref)}`
    );
  }
  if (typeof file.contract_version !== "string" || !file.contract_version) {
    throw new Error("oem-driver-configs missing contract_version");
  }
  if (!Array.isArray(file.members) || file.members.length === 0) {
    throw new Error("oem-driver-configs members must be a non-empty array");
  }

  const byCatalogueKey = new Map<string, OemDriverConfigMember>();
  const namedOfferingsByCatalogueKey = new Map<
    string,
    OemDriverConfigOffering[]
  >();
  const offeringIds = new Set<string>();

  for (const entry of file.members) {
    if (!isMember(entry)) {
      throw new Error("oem-driver-configs contains a malformed member");
    }
    if (byCatalogueKey.has(entry.catalogue_key)) {
      throw new Error(
        `oem-driver-configs duplicate catalogue_key: ${entry.catalogue_key}`
      );
    }
    if (!intelligence.headsByKey[entry.catalogue_key]) {
      throw new Error(
        `oem-driver-configs references unknown catalogue_key: ${entry.catalogue_key}`
      );
    }

    const named: OemDriverConfigOffering[] = [];
    for (const offering of entry.offerings) {
      if (offeringIds.has(offering.offering_id)) {
        throw new Error(
          `oem-driver-configs duplicate offering_id: ${offering.offering_id}`
        );
      }
      offeringIds.add(offering.offering_id);
      assertEvidenceCompleteness(offering);
      assertNamedOptionRules(offering);
      assertCompleteConfigurationRules(offering);
      assertIdentityConsistency(offering, intelligence.shaftsByKey);
      if (offering.named_option_eligible) {
        named.push(offering);
      }
    }

    byCatalogueKey.set(entry.catalogue_key, entry);
    namedOfferingsByCatalogueKey.set(entry.catalogue_key, named);
  }

  return {
    version: MATCH_OEM_DRIVER_CONFIGS_VERSION,
    intelligence_heads_ref: MATCH_HEADS_VERSION,
    intelligence_shafts_ref: MATCH_SHAFTS_VERSION,
    contract_version: file.contract_version,
    byCatalogueKey,
    namedOfferingsByCatalogueKey,
    offeringIds,
  };
}

/**
 * Load and validate the versioned OEM driver-config overlay.
 * Throws when the file is present but invalid.
 */
export function loadOemDriverConfigs(
  referenceDirectory: string,
  intelligence: Pick<MatchIntelligence, "headsByKey" | "shaftsByKey">
): OemDriverConfigsIndex {
  const path = join(referenceDirectory, OVERLAY_FILENAME);
  const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
  return validateOemDriverConfigs(raw, intelligence);
}

/**
 * Soft load for future pipeline wiring: missing overlay returns null and must
 * never disable head-only recommendations. Present-but-invalid still throws.
 */
export function loadOemDriverConfigsOrNull(
  referenceDirectory: string,
  intelligence: Pick<MatchIntelligence, "headsByKey" | "shaftsByKey">
): OemDriverConfigsIndex | null {
  const path = join(referenceDirectory, OVERLAY_FILENAME);
  if (!existsSync(path)) {
    return null;
  }
  return loadOemDriverConfigs(referenceDirectory, intelligence);
}

/** Named fitting options only — never incomplete or unresolved identities. */
export function namedOemOfferingsForHead(
  index: OemDriverConfigsIndex | null | undefined,
  catalogueKey: string
): readonly OemDriverConfigOffering[] {
  if (!index) return [];
  return index.namedOfferingsByCatalogueKey.get(catalogueKey) ?? [];
}
