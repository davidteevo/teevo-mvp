import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isListingPurchasable,
  PUBLIC_MARKETPLACE_STATUSES,
} from "@/lib/listing-availability";
import {
  collectShaftIdentityMatches,
  resolveHeadIdentity,
  resolveShaftIdentity,
} from "../identity";
import {
  isProtectedShaftPhrase,
  velocoreTechnology,
} from "../shaft-identity-policy";
import type { MatchIntelligence } from "../intelligence/load";
import type {
  MatchIdentityResolutionStatus,
  MatchInventoryItem,
} from "./types";

export type TeevoDriverListingRow = {
  id: string;
  user_id: string | null;
  brand: string | null;
  model: string | null;
  title: string | null;
  handed: string | null;
  degree: string | null;
  degree_numeric: number | null;
  shaft: string | null;
  shaft_flex: string | null;
  condition: string | null;
  price: number | null;
  status: string | null;
  archived_at: string | null;
  buying_paused: boolean | null;
  availability_confirmation_status: string | null;
};

function normalizeHandedness(
  raw: string | null | undefined
): "LEFT" | "RIGHT" | null {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim().toUpperCase();
  if (s === "LEFT" || s === "L") return "LEFT";
  if (s === "RIGHT" || s === "R") return "RIGHT";
  return null;
}

function statedLoft(row: TeevoDriverListingRow): number | null {
  if (row.degree_numeric != null && Number.isFinite(Number(row.degree_numeric))) {
    return Number(row.degree_numeric);
  }
  if (row.degree != null && row.degree !== "") {
    const n = Number(String(row.degree).replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function resolutionStatus(
  reason: string | null,
  key: string | null
): MatchIdentityResolutionStatus {
  if (reason === "AMBIGUOUS_IDENTITY") return "AMBIGUOUS";
  if (key) return "UNIQUE";
  return "UNRESOLVED";
}

/**
 * Map a Teevo listing row into the inventory contract (identity resolved).
 * Does not filter by recommended catalogue keys.
 */
export function mapTeevoListingToInventoryItem(
  row: TeevoDriverListingRow,
  intelligence: MatchIntelligence,
  checkedAt = new Date().toISOString()
): MatchInventoryItem {
  const headEvidence = {
    brand: row.brand,
    model: row.model,
    display_name: row.title,
  };
  const headRes = resolveHeadIdentity(headEvidence, intelligence.heads);
  const shaftEvidence = {
    shaft: row.shaft,
    flex: row.shaft_flex,
  };
  const shaftMatches = collectShaftIdentityMatches(
    shaftEvidence,
    intelligence.shafts
  );
  const shaftRes = resolveShaftIdentity(shaftEvidence, intelligence.shafts);
  const shaftScorable = Boolean(shaftRes.eligible && shaftRes.resolved_key);

  const purchasable = isListingPurchasable(row);
  const evidence: string[] = [];
  if (row.brand) evidence.push(`brand:${row.brand}`);
  if (row.model) evidence.push(`model:${row.model}`);
  if (row.shaft) evidence.push(`shaft:${row.shaft}`);
  if (row.shaft_flex) evidence.push(`flex:${row.shaft_flex}`);
  if (headRes.reason) evidence.push(`head:${headRes.reason}`);
  if (shaftRes.reason) evidence.push(`shaft_res:${shaftRes.reason}`);
  if (shaftRes.reason === "AMBIGUOUS_IDENTITY") {
    const keys = shaftMatches.map((match) => match.key);
    evidence.push(`shaft_candidates:${keys.join("|") || "none"}`);
    const eligible = shaftMatches.some(
      (match) => match.eligibility === "MATCH_ELIGIBLE"
    );
    const recognition = shaftMatches.some(
      (match) => match.eligibility !== "MATCH_ELIGIBLE"
    );
    if (isProtectedShaftPhrase(row.shaft) && !(eligible && recognition)) {
      evidence.push("shaft_fail_closed:protected_phrase");
    }
    if (velocoreTechnology(row.shaft) === "original") {
      evidence.push("shaft_fail_closed:velocore_generation");
    }
  } else if (shaftRes.resolved_key && !shaftScorable) {
    evidence.push(`shaft_identity_blocked:${shaftRes.resolved_key}`);
  }

  return {
    source_listing_id: row.id,
    merchant_id: row.user_id,
    source_type: "TEEVO_LISTING",
    head_key: headRes.resolved_key,
    shaft_key: shaftScorable ? shaftRes.resolved_key : null,
    listed_config: {
      brand: row.brand,
      model: row.model,
      handedness: normalizeHandedness(row.handed),
      stated_loft_deg: statedLoft(row),
      shaft_label: row.shaft,
      shaft_flex_raw: row.shaft_flex,
    },
    condition: row.condition,
    price_minor: typeof row.price === "number" ? row.price : 0,
    currency: "GBP",
    availability_status: purchasable ? "AVAILABLE" : "UNAVAILABLE",
    availability_checked_at: checkedAt,
    purchase_route: "TEEVO_CHECKOUT",
    identity: {
      head_resolution: resolutionStatus(headRes.reason, headRes.resolved_key),
      shaft_resolution: resolutionStatus(
        shaftRes.reason,
        shaftScorable ? shaftRes.resolved_key : null
      ),
      evidence,
    },
  };
}

/** Load public Driver listings without the browse grid cap (admin Match path). */
export async function loadTeevoDriverListingsForMatch(
  admin: SupabaseClient
): Promise<TeevoDriverListingRow[]> {
  const { data, error } = await admin
    .from("listings")
    .select(
      "id, user_id, brand, model, title, handed, degree, degree_numeric, shaft, shaft_flex, condition, price, status, archived_at, buying_paused, availability_confirmation_status"
    )
    .eq("category", "Driver")
    .in("status", [...PUBLIC_MARKETPLACE_STATUSES])
    .is("archived_at", null);

  if (error) throw new Error(error.message);
  return (data ?? []) as TeevoDriverListingRow[];
}
