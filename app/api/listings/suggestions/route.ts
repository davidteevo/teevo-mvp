import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MAX_SUGGESTIONS = 10;

/** Escape term for ilike (avoid breaking .or() with commas). */
function safePattern(q: string): string {
  return q.trim().replace(/,/g, " ").slice(0, 50);
}

/**
 * GET /api/listings/suggestions?q=stea
 * Returns distinct (model, brand, category) from verified listings matching q.
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
      .select("model, brand, category")
      .eq("status", "verified")
      .or(`model.ilike.${pattern},brand.ilike.${pattern},category.ilike.${pattern}`)
      .limit(50);

    if (error) {
      console.error("[suggestions] error:", error);
      return NextResponse.json({ suggestions: [] });
    }

    const seen = new Set<string>();
    const suggestions: { label: string; category: string; brand: string; model: string }[] = [];
    for (const row of rows ?? []) {
      const key = `${row.model}|${row.brand}|${row.category}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const label = `${row.model} ${row.category}`;
      suggestions.push({
        label,
        category: row.category,
        brand: row.brand,
        model: row.model,
      });
      if (suggestions.length >= MAX_SUGGESTIONS) break;
    }

    return NextResponse.json({ suggestions });
  } catch (e) {
    console.error("[suggestions] error:", e);
    return NextResponse.json({ suggestions: [] });
  }
}
