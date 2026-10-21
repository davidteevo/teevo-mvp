import { describe, expect, it } from "vitest";
import {
  presentAttachedListingLabels,
  presentListingCommercialNotes,
} from "@/lib/match/app/present-listing-labels";
import type { MatchInventoryAttachedRow, MatchInventoryItem } from "@/lib/match/inventory/types";

function item(id: string, priceMinor: number): MatchInventoryItem {
  return {
    source_listing_id: id,
    merchant_id: null,
    source_type: "TEEVO_LISTING",
    head_key: "head",
    shaft_key: "shaft",
    listed_config: {
      brand: "Ping",
      model: "G430",
      handedness: "RIGHT",
      stated_loft_deg: 10.5,
      shaft_label: "Ventus",
      shaft_flex_raw: "S",
    },
    condition: "Good",
    price_minor: priceMinor,
    currency: "GBP",
    availability_status: "AVAILABLE",
    availability_checked_at: "2026-10-21T00:00:00.000Z",
    purchase_route: "TEEVO_CHECKOUT",
    identity: {
      head_resolution: "UNIQUE",
      shaft_resolution: "UNIQUE",
      evidence: [],
    },
  };
}

function full(
  id: string,
  priceMinor: number,
  score: number,
  band = "EXCELLENT_MATCH"
): MatchInventoryAttachedRow {
  return {
    item: item(id, priceMinor),
    attach_mode: "FULL_LISTING_MATCH",
    unverified_shaft: false,
    listing_match: {
      listing_id: id,
      match_band: band,
      confidence: "HIGH",
      raw_fit_score: score,
    },
  };
}

describe("attached listing role labels", () => {
  it("puts several commercial roles on one listing when the rules assign them together", () => {
    const labels = presentAttachedListingLabels(
      [full("only", 18000, 90)],
      null
    );
    expect(labels.get("only")).toEqual(["BEST_MATCH", "BUDGET_OPTION"]);
  });

  it("keeps best match and best value on the listings that earned them", () => {
    const labels = presentAttachedListingLabels(
      [full("best", 30000, 90), full("value", 15000, 86)],
      400
    );
    expect(labels.get("best")).toEqual(["BEST_MATCH"]);
    expect(labels.get("value")).toEqual(["BEST_VALUE", "BUDGET_OPTION"]);
  });

  it("does not label a head-only listing or an unresolved shaft", () => {
    const headOnly: MatchInventoryAttachedRow = {
      item: item("head-only", 10000),
      attach_mode: "HEAD_ONLY",
      unverified_shaft: true,
      listing_match: null,
    };
    const unresolved: MatchInventoryAttachedRow = {
      ...full("unresolved", 10000, 90),
      unverified_shaft: true,
      attach_mode: "HEAD_ONLY",
      listing_match: null,
    };
    const labels = presentAttachedListingLabels([headOnly, unresolved], 200);
    expect(labels.size).toBe(0);
  });

  it("returns no labels when nothing qualifies", () => {
    expect(presentAttachedListingLabels([], 250).size).toBe(0);
  });

  it("states a real saving and a lower fit only for Best Value", () => {
    const rows = [full("best", 30000, 90), full("value", 15000, 86)];
    const labels = presentAttachedListingLabels(rows, 400);
    const notes = presentListingCommercialNotes(rows, labels);
    expect(notes.get("best")).toBeUndefined();
    expect(notes.get("value")).toEqual({
      savingGbp: 150,
      fitVersusBestMatch: "lower",
    });
  });

  it("does not invent a saving for a head-only listing or a higher price", () => {
    const headOnly: MatchInventoryAttachedRow = {
      item: item("head-only", 5000),
      attach_mode: "HEAD_ONLY",
      unverified_shaft: true,
      listing_match: null,
    };
    const rows = [full("best", 30000, 90), headOnly];
    const labels = presentAttachedListingLabels(rows, 400);
    labels.set("head-only", ["BEST_VALUE"]);
    const notes = presentListingCommercialNotes(rows, labels);
    expect(notes.has("head-only")).toBe(false);

    const dearer = [full("best", 15000, 90), full("dear", 30000, 86)];
    const dearLabels = new Map<string, Array<"BEST_MATCH" | "BEST_VALUE">>([
      ["best", ["BEST_MATCH"]],
      ["dear", ["BEST_VALUE"]],
    ]);
    expect(presentListingCommercialNotes(dearer, dearLabels).get("dear")?.savingGbp).toBeNull();
  });
});
