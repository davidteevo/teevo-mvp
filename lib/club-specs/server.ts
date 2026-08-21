import type { SupabaseClient } from "@supabase/supabase-js";
import { isGolfEquipmentCategory } from "@/lib/club-specs/schemas";
import { buildListingTitleFromSpecs } from "@/lib/club-specs/payload";
import type { ListingFormat, StandardSpecStatus, CustomisedAspect } from "@/types/database";

export type ListingClubInsert = {
  sort_order: number;
  club_type?: string;
  iron_number?: string | null;
  degree?: string | null;
  bounce?: string | null;
  grind?: string | null;
  shaft?: string | null;
  shaft_flex?: string | null;
  lie_angle?: string | null;
  club_length?: string | null;
  shaft_weight?: string | null;
  shaft_material?: string | null;
  grip_brand?: string | null;
  grip_model?: string | null;
  grip_size?: string | null;
  grip_condition?: string | null;
  spec_provenance?: Record<string, unknown> | null;
};

export function parseClubSpecsFromBody(body: Record<string, unknown>) {
  const listing_format =
    body.listing_format === "single" || body.listing_format === "set"
      ? (body.listing_format as ListingFormat)
      : null;
  const standard_spec_status =
    body.standard_spec_status === "standard" ||
    body.standard_spec_status === "customised" ||
    body.standard_spec_status === "unknown"
      ? (body.standard_spec_status as StandardSpecStatus)
      : null;
  const customised_aspects = Array.isArray(body.customised_aspects)
    ? (body.customised_aspects.filter((a) =>
        ["shaft", "length", "loft_lie", "grip", "other"].includes(String(a))
      ) as CustomisedAspect[])
    : null;
  const set_composition = Array.isArray(body.set_composition)
    ? body.set_composition.map(String).filter(Boolean)
    : null;
  const clubs = Array.isArray(body.clubs)
    ? (body.clubs as ListingClubInsert[]).filter((c) => c && typeof c === "object")
    : null;

  const str = (key: string) =>
    typeof body[key] === "string" ? (body[key] as string).trim() || null : null;

  return {
    listing_format,
    standard_spec_status,
    customised_aspects,
    customised_other_note: str("customised_other_note"),
    iron_number: str("iron_number"),
    set_composition,
    bounce: str("bounce"),
    grind: str("grind"),
    head_number: str("head_number"),
    spec_provenance:
      body.spec_provenance && typeof body.spec_provenance === "object" && !Array.isArray(body.spec_provenance)
        ? (body.spec_provenance as Record<string, unknown>)
        : {},
    clubs,
  };
}

export function validateNewGolfListingSpecs(
  category: string,
  fields: {
    handed: string | null;
    degree: string | null;
    shaft_flex: string | null;
    club_length: string | null;
    listing_format: ListingFormat | null;
    iron_number: string | null;
    set_composition: string[] | null;
    head_number: string | null;
    standard_spec_status: StandardSpecStatus | null;
    clubs: ListingClubInsert[] | null;
  }
): string | null {
  if (!isGolfEquipmentCategory(category)) return null;
  if (!fields.handed) return "Handedness is required";
  if (!fields.standard_spec_status) return "Standard spec status is required";

  if (category === "Driver") {
    if (!fields.degree) return "Loft is required";
    if (!fields.shaft_flex) return "Shaft flex is required";
  }
  if (category === "Woods" || category === "Hybrids" || category === "Driving Irons") {
    if (!fields.degree && !fields.head_number) return "Club / loft is required";
    if (!fields.shaft_flex) return "Shaft flex is required";
  }
  if (category === "Irons") {
    if (fields.listing_format === "single" && !fields.iron_number) return "Which iron is required";
    if (fields.listing_format === "set" && (!fields.set_composition || fields.set_composition.length === 0)) {
      return "Set composition is required";
    }
    if (!fields.shaft_flex) return "Shaft flex is required";
  }
  if (category === "Wedges") {
    if (fields.listing_format === "set") {
      if (!fields.clubs || fields.clubs.length === 0) return "Add at least one wedge";
      for (let i = 0; i < fields.clubs.length; i++) {
        if (!fields.clubs[i].degree) return `Loft is required for wedge ${i + 1}`;
      }
    } else if (!fields.degree) {
      return "Loft is required";
    }
  }
  if (category === "Putter" && !fields.club_length) return "Length is required";
  return null;
}

export async function replaceListingClubs(
  admin: SupabaseClient,
  listingId: string,
  clubs: ListingClubInsert[] | null | undefined
): Promise<{ error: string | null }> {
  const { error: delError } = await admin.from("listing_clubs").delete().eq("listing_id", listingId);
  if (delError) return { error: delError.message };

  if (!clubs || clubs.length === 0) return { error: null };

  const rows = clubs.map((c, i) => ({
    listing_id: listingId,
    sort_order: typeof c.sort_order === "number" ? c.sort_order : i,
    club_type: c.club_type || "wedge",
    iron_number: c.iron_number ?? null,
    degree: c.degree ?? null,
    bounce: c.bounce ?? null,
    grind: c.grind ?? null,
    shaft: c.shaft ?? null,
    shaft_flex: c.shaft_flex ?? null,
    lie_angle: c.lie_angle ?? null,
    club_length: c.club_length ?? null,
    shaft_weight: c.shaft_weight ?? null,
    shaft_material: c.shaft_material ?? null,
    grip_brand: c.grip_brand ?? null,
    grip_model: c.grip_model ?? null,
    grip_size: c.grip_size ?? null,
    grip_condition: c.grip_condition ?? null,
    spec_provenance: c.spec_provenance ?? {},
  }));

  const { error: insertError } = await admin.from("listing_clubs").insert(rows);
  return { error: insertError?.message ?? null };
}

export function deriveTitleIfMissing(input: {
  title: string | null;
  category: string;
  brand: string;
  model: string | null;
  handed: "left" | "right" | null;
  degree: string | null;
  shaft_flex: string | null;
  shaft: string | null;
  listing_format: ListingFormat | null;
  iron_number: string | null;
  set_composition: string[] | null;
  head_number: string | null;
  club_length: string | null;
  standard_spec_status: StandardSpecStatus | null;
  clubs: ListingClubInsert[] | null;
}): string | null {
  if (input.title?.trim()) return input.title.trim();
  if (!isGolfEquipmentCategory(input.category)) return input.title;
  return buildListingTitleFromSpecs({
    category: input.category,
    brand: input.brand,
    model: input.model,
    handed: input.handed,
    degree: input.degree,
    shaft_flex: input.shaft_flex,
    shaft: input.shaft,
    listing_format: input.listing_format,
    iron_number: input.iron_number,
    set_composition: input.set_composition,
    head_number: input.head_number,
    club_length: input.club_length,
    standard_spec_status: input.standard_spec_status,
    clubs: input.clubs ?? undefined,
  });
}
