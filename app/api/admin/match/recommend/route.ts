import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/referral/admin-auth";
import {
  loadMatchIntelligence,
  matchReferenceDirectory,
  runCatalogueRecommendation,
} from "@/lib/match";
import type { MatchInventoryItem } from "@/lib/match/inventory/types";
import {
  loadTeevoDriverListingsForMatch,
  mapTeevoListingToInventoryItem,
} from "@/lib/match/inventory/teevo-listings";

export const dynamic = "force-dynamic";

/**
 * Admin-only Teevo Fit recommend endpoint (Checkpoint A + B).
 * Independent of public match_enabled. Does not change purchase flows.
 * A future beta allowlist must use the same server check as canAccessTeevoFit
 * before this handler runs. Do not open it by flipping match_enabled.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const answers =
    body &&
    typeof body === "object" &&
    body.answers &&
    typeof body.answers === "object"
      ? (body.answers as Record<string, unknown>)
      : body;

  const intelligence = loadMatchIntelligence(matchReferenceDirectory());

  let inventory: MatchInventoryItem[] = [];
  let inventoryStatus: "ready" | "unavailable" = "ready";
  try {
    const rows = await loadTeevoDriverListingsForMatch(auth.admin);
    const checkedAt = new Date().toISOString();
    inventory = rows
      .map((row) => mapTeevoListingToInventoryItem(row, intelligence, checkedAt))
      .filter((item) => item.availability_status === "AVAILABLE");
  } catch {
    // Catalogue recommendations must still succeed if inventory load fails.
    inventory = [];
    inventoryStatus = "unavailable";
  }

  const result = runCatalogueRecommendation({
    answers,
    intelligence,
    inventory,
  });

  if (result.mode === "VALIDATION_ERROR") {
    return NextResponse.json(
      {
        error: "Validation failed",
        validation_errors: result.validation_errors,
        result,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    preview: "ADMIN_CATALOGUE_AND_INVENTORY",
    public_match_enabled: false,
    inventory_attached: result.audit.inventory_items_attached > 0,
    inventory_status: inventoryStatus,
    result,
  });
}
