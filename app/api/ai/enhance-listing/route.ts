import { chatCompletionJson } from "@/lib/ai";
import { NextResponse } from "next/server";
import {
  ALL_CATEGORIES,
  CONDITIONS,
  clubCategoryTitleNoun,
  isClothingCategory,
  isAccessoriesCategory,
  normalizeListingTitleForCategory,
} from "@/lib/listing-categories";

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
  lie_angle?: string;
  club_length?: string;
  shaft_weight?: string;
  shaft_material?: string;
  grip_brand?: string;
  grip_model?: string;
  grip_size?: string;
  grip_condition?: string;
  item_type?: string;
  size?: string;
  colour?: string;
  handed?: string;
  standard_spec_status?: string;
  customised_aspects?: string[];
  customised_other_note?: string;
  headcover_included?: boolean | null;
  bounce?: string;
  grind?: string;
  iron_number?: string;
  set_composition?: string[];
  head_number?: string;
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

Write a professional buyer-facing listing description (one or two short paragraphs). It must read like a shop product description — not a form dump.

RULES:
1. Open with what the club is (brand, model, category) and the key specs (loft, flex, hand, shaft, set composition, etc.) that are provided.
2. If the seller left optional notes, you MUST weave every fact they mentioned into the description (marks, damage, reason for selling, extras). Correct spelling and grammar; do not drop their details.
3. If the club is customised / modified, you MUST clearly mention those modifications (shaft change, lengthened/shortened vs standard, loft/lie, grip, or the seller's "other" note).
4. If a headcover is included or not included, mention it when that fact is provided.
5. If spec is standard, you may say it is standard specification. If the seller is not sure, do not invent that it is standard.
6. Do not invent facts that were not provided. Do not use bullet points unless the seller listed separate items.
7. Use a professional, buyer-friendly UK tone.

You must return JSON only with these keys:
- title: A concise listing title (e.g. "Ping G425 Max Driver – 10.5° – Regular Shaft – Excellent Condition"). Include brand, model, key spec if known (loft, shaft, flex), and condition. For Woods, Driving Irons, Hybrids, and Wedges, use the singular form. For Irons sets, use "Irons".
- description: The full listing description following the rules above.
- shaft: Extract shaft model from the seller's notes if mentioned; otherwise null.
- degree: Extract loft/degree if mentioned in notes; otherwise null.
- shaft_flex: One of "Senior", "Regular", "Stiff", "X-Stiff", "Other" if mentioned; otherwise null.
- tags: Optional array of 2–5 searchable tags. Use title case. Omit if not applicable.

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
 * Body: { category?, brand?, model?, condition?, description?, title?, shaft?, degree?, shaft_flex?, lie_angle?, club_length?, shaft_weight?, shaft_material?, grip_brand?, grip_model?, grip_size?, grip_condition?, item_type?, size?, colour? }
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
    const lie_angle = typeof body.lie_angle === "string" ? body.lie_angle.trim() : "";
    const club_length = typeof body.club_length === "string" ? body.club_length.trim() : "";
    const shaft_weight = typeof body.shaft_weight === "string" ? body.shaft_weight.trim() : "";
    const shaft_material = typeof body.shaft_material === "string" ? body.shaft_material.trim() : "";
    const grip_brand = typeof body.grip_brand === "string" ? body.grip_brand.trim() : "";
    const grip_model = typeof body.grip_model === "string" ? body.grip_model.trim() : "";
    const grip_size = typeof body.grip_size === "string" ? body.grip_size.trim() : "";
    const grip_condition = typeof body.grip_condition === "string" ? body.grip_condition.trim() : "";
    const item_type = typeof body.item_type === "string" ? body.item_type.trim() : "";
    const size = typeof body.size === "string" ? body.size.trim() : "";
    const colour = typeof body.colour === "string" ? body.colour.trim() : "";
    const handed = typeof body.handed === "string" ? body.handed.trim() : "";
    const standard_spec_status =
      typeof body.standard_spec_status === "string" ? body.standard_spec_status.trim() : "";
    const customised_aspects = Array.isArray(body.customised_aspects)
      ? body.customised_aspects.map(String).filter(Boolean)
      : [];
    const customised_other_note =
      typeof body.customised_other_note === "string" ? body.customised_other_note.trim() : "";
    const bounce = typeof body.bounce === "string" ? body.bounce.trim() : "";
    const grind = typeof body.grind === "string" ? body.grind.trim() : "";
    const iron_number = typeof body.iron_number === "string" ? body.iron_number.trim() : "";
    const set_composition = Array.isArray(body.set_composition)
      ? body.set_composition.map(String).filter(Boolean)
      : [];
    const head_number = typeof body.head_number === "string" ? body.head_number.trim() : "";
    const headcover_included =
      body.headcover_included === true
        ? true
        : body.headcover_included === false
          ? false
          : null;

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
        ? `The seller added these optional notes. You MUST include all of this in the listing description (proofread, do not drop facts):\n\n"${description}"`
        : "The seller left optional notes empty. Write the listing description from the structured details below.",
      itemLine,
      title ? `Listing title: ${title}` : "",
      !isStructured && handed ? `Handed: ${handed}` : "",
      !isStructured && head_number ? `Club/head number: ${head_number}` : "",
      !isStructured && iron_number ? `Iron: ${iron_number}` : "",
      !isStructured && set_composition.length ? `Set composition: ${set_composition.join(", ")}` : "",
      !isStructured && shaft ? `Shaft: ${shaft}` : "",
      !isStructured && degree ? `Degree/loft: ${degree}` : "",
      !isStructured && shaft_flex ? `Shaft flex: ${shaft_flex}` : "",
      !isStructured && lie_angle ? `Lie angle: ${lie_angle}` : "",
      !isStructured && club_length ? `Club length vs standard (or putter length): ${club_length}` : "",
      !isStructured && shaft_weight ? `Shaft weight: ${shaft_weight}` : "",
      !isStructured && shaft_material ? `Shaft material: ${shaft_material}` : "",
      !isStructured && (grip_brand || grip_model)
        ? `Grip: ${[grip_brand, grip_model].filter(Boolean).join(" ")}`
        : "",
      !isStructured && grip_size ? `Grip size: ${grip_size}` : "",
      !isStructured && grip_condition ? `Grip condition: ${grip_condition}` : "",
      !isStructured && bounce ? `Bounce: ${bounce}` : "",
      !isStructured && grind ? `Grind: ${grind}` : "",
      !isStructured && standard_spec_status
        ? `Specification status: ${
            standard_spec_status === "standard"
              ? "standard spec (not modified after purchase)"
              : standard_spec_status === "customised"
                ? "customised / modified"
                : "seller is not sure if it has been modified"
          }`
        : "",
      !isStructured && customised_aspects.length
        ? `Modifications selected: ${customised_aspects.join(", ")}.`
        : "",
      !isStructured && customised_other_note
        ? `Modification details from seller: ${customised_other_note}`
        : "",
      !isStructured && headcover_included === true ? "Headcover: included." : "",
      !isStructured && headcover_included === false ? "Headcover: not included." : "",
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
      const normalizedTitle = isStructured ? result!.title : normalizeListingTitleForCategory(result!.title, category);
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

    const fallbackTitle = [brand, model, clubCategoryTitleNoun(category)].filter(Boolean).join(" ");
    const fallbackParts = [`${brand} ${model} ${category} in ${condition} condition.`];
    if (degree) fallbackParts.push(`Loft: ${degree}°.`);
    if (shaft) fallbackParts.push(`Shaft: ${shaft}.`);
    if (shaft_flex) fallbackParts.push(`Flex: ${shaft_flex}.`);
    if (lie_angle) fallbackParts.push(`Lie: ${lie_angle}.`);
    if (club_length) fallbackParts.push(`Length: ${club_length}.`);
    if (shaft_weight) fallbackParts.push(`Shaft weight: ${shaft_weight}.`);
    if (shaft_material) fallbackParts.push(`Shaft material: ${shaft_material}.`);
    if (grip_brand || grip_model)
      fallbackParts.push(`Grip: ${[grip_brand, grip_model].filter(Boolean).join(" ")}.`);
    if (grip_size) fallbackParts.push(`Grip size: ${grip_size}.`);
    if (grip_condition) fallbackParts.push(`Grip condition: ${grip_condition}.`);
    if (standard_spec_status === "customised") {
      fallbackParts.push(
        `This club has been customised${customised_aspects.length ? ` (${customised_aspects.join(", ")})` : ""}.`
      );
    }
    if (customised_other_note) fallbackParts.push(customised_other_note);
    if (headcover_included === true) fallbackParts.push("Headcover included.");
    if (headcover_included === false) fallbackParts.push("Headcover not included.");
    if (description) fallbackParts.push(description.trim());
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
