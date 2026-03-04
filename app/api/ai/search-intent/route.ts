import { chatCompletionJson } from "@/lib/ai";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CATEGORIES = ["Driver", "Woods", "Irons", "Wedges", "Putter", "Apparel", "Bag"];
const BRANDS = ["Titleist", "Callaway", "TaylorMade", "Ping", "Cobra", "Mizuno", "Srixon", "Wilson", "Other"];
const SHAFT_FLEX = ["Senior", "Regular", "Stiff", "X-Stiff", "Other"];

interface SearchIntentResult {
  filters: {
    category?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    shaft?: string;
    shaftFlex?: string;
    degree?: string;
  };
  refinementQuestion?: string;
}

const SYSTEM_PROMPT = `You are a golf equipment search assistant for a UK resale marketplace.
The user describes what they want in natural language. You must return JSON only with:
- filters: Object with optional keys: category, brand, minPrice, maxPrice, search, shaft, shaftFlex, degree.
  - category: must be exactly one of: ${CATEGORIES.join(", ")}. Omit if unclear or they want "any".
  - brand: must be exactly one of: ${BRANDS.join(", ")}. Omit if not mentioned or "any".
  - minPrice: number in pounds (e.g. 50 for £50). Only if they mention a minimum budget.
  - maxPrice: number in pounds (e.g. 250 for £250). Only if they mention a maximum budget or "under £X".
  - search: string, the main model or product name they mentioned (e.g. "G425", "Stealth 2", "Scotty Cameron"). Omit if not a specific model.
  - shaft: string, shaft model name if mentioned (e.g. "Ventus Blue", "Project X"). Omit if not mentioned.
  - shaftFlex: must be exactly one of: ${SHAFT_FLEX.join(", ")}. Only if they mention flex (stiff, regular, x-stiff, senior, etc.). Omit otherwise.
  - degree: string, loft/degree if mentioned (e.g. "10.5", "9"). Omit if not mentioned.
- refinementQuestion: Optional string. If the query is ambiguous (e.g. "driver for someone who slices" could mean max forgiveness vs adjustable), ask one short clarifying question. Otherwise omit or null.

Examples:
- "Forgiving driver under £250" -> { "filters": { "category": "Driver", "maxPrice": 250 }, "refinementQuestion": null }
- "Ping G425" -> { "filters": { "category": "Driver", "brand": "Ping", "search": "G425" }, "refinementQuestion": null }
- "Stiff flex driver" -> { "filters": { "category": "Driver", "shaftFlex": "Stiff" }, "refinementQuestion": null }
- "Ventus Blue 10.5 driver" -> { "filters": { "category": "Driver", "shaft": "Ventus Blue", "degree": "10.5" }, "refinementQuestion": null }
Always return valid JSON. Use only the exact category, brand, and shaftFlex values listed.`;

/**
 * POST /api/ai/search-intent
 * Body: { query: string }
 * Returns structured filters and optional refinement question. No auth required.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const query = typeof body.query === "string" ? body.query.trim() : "";
    if (!query.length) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    const result = await chatCompletionJson<SearchIntentResult>(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: query },
      ],
      { model: "gpt-4o-mini" }
    );

    if (!result || !result.filters || typeof result.filters !== "object") {
      return NextResponse.json(
        { error: "Could not understand your search. Try filters below." },
        { status: 502 }
      );
    }

    const filters = result.filters;
    const category =
      typeof filters.category === "string" && CATEGORIES.includes(filters.category)
        ? filters.category
        : undefined;
    const brand =
      typeof filters.brand === "string" && BRANDS.includes(filters.brand)
        ? filters.brand
        : undefined;
    const minPrice =
      typeof filters.minPrice === "number" && Number.isFinite(filters.minPrice) && filters.minPrice >= 0
        ? filters.minPrice
        : undefined;
    const maxPrice =
      typeof filters.maxPrice === "number" && Number.isFinite(filters.maxPrice) && filters.maxPrice >= 0
        ? filters.maxPrice
        : undefined;
    const search =
      typeof filters.search === "string" && filters.search.trim().length > 0
        ? filters.search.trim().slice(0, 100)
        : undefined;
    const shaft =
      typeof filters.shaft === "string" && filters.shaft.trim().length > 0
        ? filters.shaft.trim().slice(0, 80)
        : undefined;
    const shaftFlex =
      typeof filters.shaftFlex === "string" && SHAFT_FLEX.includes(filters.shaftFlex)
        ? filters.shaftFlex
        : undefined;
    const degree =
      typeof filters.degree === "string" && filters.degree.trim().length > 0
        ? filters.degree.trim().slice(0, 20)
        : undefined;

    return NextResponse.json({
      filters: {
        ...(category && { category }),
        ...(brand && { brand }),
        ...(minPrice != null && { minPrice: String(minPrice) }),
        ...(maxPrice != null && { maxPrice: String(maxPrice) }),
        ...(search && { search }),
        ...(shaft && { shaft }),
        ...(shaftFlex && { shaftFlex }),
        ...(degree && { degree }),
      },
      refinementQuestion:
        typeof result.refinementQuestion === "string" && result.refinementQuestion.trim()
          ? result.refinementQuestion.trim()
          : undefined,
    });
  } catch (e) {
    console.error("Search intent error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
