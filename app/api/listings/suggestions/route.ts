import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getListingDisplayTitle } from "@/lib/listing-display";
import type { Listing } from "@/types/database";

export const dynamic = "force-dynamic";

const MAX_SUGGESTIONS = 10;

/** Escape term for ilike (avoid breaking .or() with commas). */
function safePattern(q: string): string {
  return q.trim().replace(/,/g, " ").slice(0, 50);
}

/**
 * GET /api/listings/suggestions?q=stea
 * Returns distinct (model, brand, category, item_type, size, title) from verified listings matching q.
 * No auth required; read-only.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    if (!q || q.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const pattern = `%${safePattern(q)}%`;
    const supabase = createAdminClient();
    const { data: rows, error } = await supabase
      .from("listings")
      .select("model, brand, category, title, item_type, size, colour")
      .eq("status", "verified")
      .or(
        `model.ilike.${pattern},brand.ilike.${pattern},category.ilike.${pattern},title.ilike.${pattern},item_type.ilike.${pattern},size.ilike.${pattern},colour.ilike.${pattern}`
      )
      .limit(50);

    if (error) {
      console.error("[suggestions] error:", error);
      return NextResponse.json({ suggestions: [] });
    }

    const seen = new Set<string>();
    const suggestions: { label: string; category: string; brand: string; model: string }[] = [];
    for (const row of rows ?? []) {
      const listing = row as unknown as Listing;
      const key = `${listing.category}|${listing.brand}|${listing.model ?? ""}|${listing.item_type ?? ""}|${listing.size ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const label = getListingDisplayTitle(listing);
      suggestions.push({
        label,
        category: listing.category,
        brand: listing.brand,
        model: listing.model ?? "",
      });
      if (suggestions.length >= MAX_SUGGESTIONS) break;
    }

    return NextResponse.json({ suggestions });
  } catch (e) {
    console.error("[suggestions] error:", e);
    return NextResponse.json({ suggestions: [] });
  }
}
