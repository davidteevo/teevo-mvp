import { chatCompletionJson } from "@/lib/ai";
import { NextResponse } from "next/server";
import {
  ALL_CATEGORIES,
  CONDITIONS,
  isClothingCategory,
  isAccessoriesCategory,
} from "@/lib/listing-categories";

export const dynamic = "force-dynamic";

const ALLOWED_CATEGORIES_SET = new Set<string>(ALL_CATEGORIES);
const ALLOWED_CONDITIONS_SET = new Set<string>(CONDITIONS);

/** For these categories, use singular in titles (one club per listing). */
const CATEGORY_TO_SINGULAR_TITLE: Record<string, string> = {
  Woods: "Wood",
  "Driving Irons": "Driving Iron",
  Hybrids: "Hybrid",
  Wedges: "Wedge",
};

function ensureSingularTitle(title: string, category: string): string {
  const singular = CATEGORY_TO_SINGULAR_TITLE[category];
  if (!singular) return title;
  let t = title;
  t = t.replace(/\bDriving Irons\b/g, "Driving Iron");
  t = t.replace(/\bWoods\b/g, "Wood");
  t = t.replace(/\bHybrids\b/g, "Hybrid");
  t = t.replace(/\bWedges\b/g, "Wedge");
  return t;
}

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
  item_type?: string;
  size?: string;
  colour?: string;
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
1. When the seller provides description text, you MUST interpret it and include all of their content in your output. Correct spelling and grammar, but do not drop or replace their details with generic text. Every fact, reason, or detail they mention must appear in the final description.
2. Rewrite the content as one coherent paragraph (or two short paragraphs if there are two distinct topics). Use full, flowing sentences with correct punctuation. Do not output bullet points or a list unless the seller explicitly listed multiple separate items.
3. Keep the seller's meaning and all facts (condition, reason for selling, use, upgrades, damage, etc.). Do not add details they did not mention.
4. Use a professional, buyer-friendly tone. The result should read like a short product description in a shop.

Example: Seller wrote "ping driver good condtion seling as upgrading to new model hardly used" → description: "Ping driver in good condition. Selling as I am upgrading to a new model; this one has been hardly used."

You must return JSON only with these keys:
- title: A concise listing title (e.g. "Ping G425 Max Driver – 10.5° – Regular Shaft – Excellent Condition"). Include brand, model, key spec if known, and condition. For categories Woods, Driving Irons, Hybrids, and Wedges, use the singular form in the title (e.g. "3 Wood", "Driving Iron", "Hybrid", "Wedge") because each listing is for one club.
- description: The seller's text rewritten as one flowing, proofread paragraph. All spelling and grammar corrected; same meaning and facts.
- shaft: Extract shaft model from the seller's text if mentioned; otherwise null.
- degree: Extract loft/degree (e.g. "10.5") for drivers/woods if mentioned; otherwise null.
- shaft_flex: One of "Senior", "Regular", "Stiff", "X-Stiff", "Other" if mentioned; otherwise null.
- tags: Optional array of 2–5 searchable tags (e.g. "Forgiving", "High launch"). Use title case. Omit if not applicable.

Always return valid JSON. Use null for optional fields when unknown.`;

const SYSTEM_PROMPT_APPAREL = `You are an expert at writing clear, search-friendly listings for golf clothing and accessories on a UK resale marketplace.

DESCRIPTION REWRITE RULES (you must follow these exactly):
1. When the seller provides description text, you MUST interpret it and include all of their content in your output. Proofread and correct spelling and grammar, but do not drop or replace their details with generic text. Every fact, reason, or detail they mention must appear in the final description.
2. Rewrite the content as one coherent paragraph (or two short paragraphs if there are two distinct topics). Use full, flowing sentences with correct punctuation. Do not output bullet points or a list unless the seller explicitly listed multiple separate items.
3. Keep the seller's meaning and all facts (condition, reason for selling, fit, damage, etc.). Do not add details they did not mention.
4. Use a professional, buyer-friendly tone. The result should read like a short product description in a shop.
5. If the seller left the description empty, write a short, professional description based only on the item details (category, brand, type, size, colour, condition).

You must return JSON only with these keys:
- title: A concise listing title (e.g. "Nike Golf Polo – Medium – Navy – Excellent Condition" or "Bushnell Tour V5 Range Finder – Like New"). Include brand, item type, key details (size, colour, model if relevant), and condition.
- description: The seller's text rewritten as one flowing, proofread paragraph. All spelling and grammar corrected; same meaning and facts.
- shaft: null (not applicable).
- degree: null (not applicable).
- shaft_flex: null (not applicable).
- tags: Optional array of 2–5 searchable tags (e.g. "Waterproof", "Lightweight"). Use title case. Omit if not applicable.

Always return valid JSON. Use null for shaft, degree, shaft_flex.`;

/**
 * POST /api/ai/enhance-listing
 * Body: { category?, brand?, model?, condition?, description?, title?, shaft?, degree?, shaft_flex?, item_type?, size?, colour? }
 * Returns AI-suggested title, description, and extracted specs. For clubs: model required. For Clothing/Accessories: item_type required.
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
    const item_type = typeof body.item_type === "string" ? body.item_type.trim() : "";
    const size = typeof body.size === "string" ? body.size.trim() : "";
    const colour = typeof body.colour === "string" ? body.colour.trim() : "";

    if (!category || !ALLOWED_CATEGORIES_SET.has(category)) {
      return NextResponse.json({ error: "Invalid or missing category" }, { status: 400 });
    }
    if (!brand?.length) {
      return NextResponse.json({ error: "Missing brand" }, { status: 400 });
    }
    if (isClothingCategory(category) || isAccessoriesCategory(category)) {
      if (!item_type?.length) {
        return NextResponse.json({ error: "Missing item type" }, { status: 400 });
      }
    } else {
      if (!model?.length) {
        return NextResponse.json({ error: "Missing model" }, { status: 400 });
      }
    }
    if (!condition || !ALLOWED_CONDITIONS_SET.has(condition)) {
      return NextResponse.json({ error: "Invalid or missing condition" }, { status: 400 });
    }

    const isStructured = isClothingCategory(category) || isAccessoriesCategory(category);
    const systemPrompt = isStructured ? SYSTEM_PROMPT_APPAREL : SYSTEM_PROMPT;

    const itemLine = isStructured
      ? [
          `Item: ${category}, ${brand}, ${item_type}.`,
          size ? `Size: ${size}.` : "",
          colour ? `Colour: ${colour}.` : "",
          category === "Accessories" && model ? `Model: ${model}.` : "",
          `Condition: ${condition}.`,
        ]
          .filter(Boolean)
          .join(" ")
      : `Item: ${category}, ${brand} ${model}. Condition: ${condition}.`;

    const userPrompt = [
      description
        ? `The seller wrote the following. Interpret and rewrite it: correct spelling and grammar, and output as one coherent paragraph. You must include all details and facts they mentioned in your output description.\n\nSeller's text:\n"${description}"`
        : "Seller left the description empty. Write a short, professional description based on the item details below.",
      itemLine,
      title ? `Current title (improve if needed): ${title}` : "",
      !isStructured && shaft ? `Shaft: ${shaft}` : "",
      !isStructured && degree ? `Degree/loft: ${degree}` : "",
      !isStructured && shaft_flex ? `Shaft flex: ${shaft_flex}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const result = await chatCompletionJson<EnhanceResult>(
      [
        { role: "system", content: systemPrompt },
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
      const normalizedTitle = isStructured ? result!.title : ensureSingularTitle(result!.title, category);
      return NextResponse.json({
        title: normalizedTitle,
        description: typeof result!.description === "string" ? result!.description : "",
        shaft: isStructured ? null : (result!.shaft ?? null),
        degree: isStructured ? null : (result!.degree ?? null),
        shaft_flex: isStructured ? null : (result!.shaft_flex ?? null),
        tags: Array.isArray(result!.tags) ? result!.tags : [],
      });
    }

    // Fallback when LLM is unavailable or returns invalid JSON.
    if (isStructured) {
      const fallbackTitleParts = [brand, item_type, size, colour].filter(Boolean);
      const fallbackTitle = fallbackTitleParts.length
        ? `${fallbackTitleParts.join(" – ")} – ${condition}`
        : condition;
      const fallbackDescParts = [`${brand} ${item_type}${size ? `, size ${size}` : ""}${colour ? `, ${colour}` : ""}. ${condition} condition.`];
      if (description) fallbackDescParts.push(description.trim());
      fallbackDescParts.push("Check photos for full details.");
      return NextResponse.json({
        title: fallbackTitle,
        description: fallbackDescParts.join(" "),
        shaft: null,
        degree: null,
        shaft_flex: null,
        tags: [],
      });
    }

    const categoryForTitle = CATEGORY_TO_SINGULAR_TITLE[category] ?? category;
    const fallbackTitle = [brand, model, categoryForTitle].filter(Boolean).join(" ");
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
