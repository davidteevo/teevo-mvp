import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { ALL_CATEGORIES, CONDITIONS } from "@/lib/listing-categories";

export const dynamic = "force-dynamic";

const ALLOWED_CATEGORIES_SET = new Set<string>(ALL_CATEGORIES);
const ALLOWED_CONDITIONS_SET = new Set<string>(CONDITIONS);
const MIN_SAMPLES_FOR_PLATFORM = 3;

/**
 * GET /api/ai/price-guidance?category=...&brand=...&model=...&condition=...
 * Returns estimated resale range from platform data (verified + sold listings).
 * No auth required (public guidance).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category")?.trim();
    const brand = searchParams.get("brand")?.trim();
    const model = searchParams.get("model")?.trim();
    const condition = searchParams.get("condition")?.trim();

    if (!category || !ALLOWED_CATEGORIES_SET.has(category)) {
      return NextResponse.json({ error: "Invalid or missing category" }, { status: 400 });
    }
    if (!brand?.length) {
      return NextResponse.json({ error: "Missing brand" }, { status: 400 });
    }
    if (!model?.length) {
      return NextResponse.json({ error: "Missing model" }, { status: 400 });
    }
    if (!condition || !ALLOWED_CONDITIONS_SET.has(condition)) {
      return NextResponse.json({ error: "Invalid or missing condition" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: rows, error } = await supabase
      .from("listings")
      .select("price")
      .in("status", ["verified", "sold"])
      .eq("category", category)
      .eq("brand", brand)
      .eq("condition", condition)
      .ilike("model", `%${model}%`);

    if (error) {
      console.error("Price guidance query error:", error);
      return NextResponse.json({ error: "Failed to fetch price data" }, { status: 500 });
    }

    const prices = (rows ?? []).map((r) => r.price).filter((p): p is number => typeof p === "number" && p > 0);
    if (prices.length === 0) {
      return NextResponse.json({
        minPence: null,
        maxPence: null,
        source: "limited",
      });
    }

    const sorted = [...prices].sort((a, b) => a - b);
    const p25Index = Math.max(0, Math.floor(sorted.length * 0.25) - 1);
    const p75Index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.75));
    const minPence = sorted[p25Index];
    const maxPence = sorted[p75Index];
    const source = prices.length >= MIN_SAMPLES_FOR_PLATFORM ? "platform" : "limited";

    return NextResponse.json({
      minPence,
      maxPence,
      source,
    });
  } catch (e) {
    console.error("Price guidance error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
