import { chatCompletionJson } from "@/lib/ai";
import { NextResponse } from "next/server";
import { ALL_CATEGORIES, CONDITIONS } from "@/lib/listing-categories";

export const dynamic = "force-dynamic";

const ALLOWED_CATEGORIES_SET = new Set<string>(ALL_CATEGORIES);
const ALLOWED_CONDITIONS_SET = new Set<string>(CONDITIONS);

interface EnhanceBody {
  category?: string;
  brand?: string;
  model?: string;
  condition?: string;
  description?: string;
  title?: string;
  shaft?: string;
  degree?: string;
  shaft_flex?: string;
}

interface EnhanceResult {
  title: string;
  description: string;
  shaft?: string | null;
  degree?: string | null;
  shaft_flex?: string | null;
  tags?: string[];
}

const SYSTEM_PROMPT = `You are an expert at writing clear, search-friendly golf equipment listings for a UK resale marketplace.

DESCRIPTION REWRITE RULES (you must follow these exactly):
1. Correct every spelling mistake and grammar error in the seller's text. Do not leave any typos or broken grammar.
2. Rewrite the content as one coherent paragraph (or two short paragraphs if there are two distinct topics). Use full, flowing sentences with correct punctuation. Do not output bullet points or a list unless the seller explicitly listed multiple separate items.
3. Keep the seller's meaning and all facts (condition, reason for selling, use, upgrades, damage, etc.). Do not add details they did not mention.
4. Use a professional, buyer-friendly tone. The result should read like a short product description in a shop.

Example: Seller wrote "ping driver good condtion seling as upgrading to new model hardly used" → description: "Ping driver in good condition. Selling as I am upgrading to a new model; this one has been hardly used."

You must return JSON only with these keys:
- title: A concise listing title (e.g. "Ping G425 Max Driver – 10.5° – Regular Shaft – Excellent Condition"). Include brand, model, key spec if known, and condition.
- description: The seller's text rewritten as one flowing, proofread paragraph. All spelling and grammar corrected; same meaning and facts.
- shaft: Extract shaft model from the seller's text if mentioned; otherwise null.
- degree: Extract loft/degree (e.g. "10.5") for drivers/woods if mentioned; otherwise null.
- shaft_flex: One of "Senior", "Regular", "Stiff", "X-Stiff", "Other" if mentioned; otherwise null.
- tags: Optional array of 2–5 searchable tags (e.g. "Forgiving", "High launch"). Use title case. Omit if not applicable.

Always return valid JSON. Use null for optional fields when unknown.`;

/**
 * POST /api/ai/enhance-listing
 * Body: { category?, brand?, model?, condition?, description?, title?, shaft?, degree?, shaft_flex? }
 * Returns AI-suggested title, description, and extracted specs. Auth optional (could require auth later).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as EnhanceBody;
    const category = typeof body.category === "string" ? body.category.trim() : "";
    const brand = typeof body.brand === "string" ? body.brand.trim() : "";
    const model = typeof body.model === "string" ? body.model.trim() : "";
    const condition = typeof body.condition === "string" ? body.condition.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const shaft = typeof body.shaft === "string" ? body.shaft.trim() : "";
    const degree = typeof body.degree === "string" ? body.degree.trim() : "";
    const shaft_flex = typeof body.shaft_flex === "string" ? body.shaft_flex.trim() : "";

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

    const userPrompt = [
      description
        ? `Rewrite the following seller description. Correct all spelling and grammar, and output as one coherent paragraph that flows well.\n\nSeller's text:\n"${description}"`
        : "Seller left the description empty. Write a short, professional description based on the item details below.",
      `Item: ${category}, ${brand} ${model}. Condition: ${condition}.`,
      title ? `Current title (improve if needed): ${title}` : "",
      shaft ? `Shaft: ${shaft}` : "",
      degree ? `Degree/loft: ${degree}` : "",
      shaft_flex ? `Shaft flex: ${shaft_flex}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const result = await chatCompletionJson<EnhanceResult>(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      { model: "gpt-4o-mini" }
    );

    const llmDescription = typeof result?.description === "string" ? result.description.trim() : "";
    const inputDescNorm = description.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 200);
    const llmDescNorm = llmDescription.toLowerCase().replace(/\s+/g, " ").slice(0, 200);
    const isExactEcho = inputDescNorm.length > 15 && llmDescNorm === inputDescNorm;
    const hasValidResult = result && typeof result.title === "string" && llmDescription.length > 0 && !isExactEcho;

    if (hasValidResult) {
      return NextResponse.json({
        title: result!.title,
        description: typeof result!.description === "string" ? result!.description : "",
        shaft: result!.shaft ?? null,
        degree: result!.degree ?? null,
        shaft_flex: result!.shaft_flex ?? null,
        tags: Array.isArray(result!.tags) ? result!.tags : [],
      });
    }

    // Fallback when LLM is unavailable (e.g. no OPENAI_API_KEY) or returns invalid JSON.
    // Do not echo the user's raw description (it may contain typos); build from structured fields only.
    const fallbackTitle = [brand, model, category].filter(Boolean).join(" ");
    const fallbackParts = [`${brand} ${model} ${category} in ${condition} condition.`];
    if (degree) fallbackParts.push(`Loft: ${degree}°.`);
    if (shaft) fallbackParts.push(`Shaft: ${shaft}.`);
    if (shaft_flex) fallbackParts.push(`Flex: ${shaft_flex}.`);
    fallbackParts.push("Check photos for full details.");
    const fallbackDescription = fallbackParts.join(" ");

    return NextResponse.json({
      title: fallbackTitle ? `${fallbackTitle} – ${condition}` : condition,
      description: fallbackDescription,
      shaft: shaft || null,
      degree: degree || null,
      shaft_flex: shaft_flex || null,
      tags: [],
    });
  } catch (e) {
    console.error("Enhance listing error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
