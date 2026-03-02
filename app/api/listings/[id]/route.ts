import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { categoryToParcelPreset } from "@/lib/shippo";

export const dynamic = "force-dynamic";

const ALLOWED_CATEGORIES = ["Driver", "Woods", "Irons", "Wedges", "Putter", "Apparel", "Bag"];
const ALLOWED_CONDITIONS = ["New", "Excellent", "Good", "Fair", "Used"];

/**
 * PATCH /api/listings/[id]
 * Seller can update own pending listing: title, category, brand, model, condition, description, price, shaft, degree, shaft_flex.
 * parcel_preset is derived from category when category is updated.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: listing, error: fetchError } = await admin
    .from("listings")
    .select("id, user_id, status")
    .eq("id", id)
    .single();

  if (fetchError || !listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (listing.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (listing.status !== "pending") {
    return NextResponse.json(
      { error: "Only pending listings can be edited" },
      { status: 400 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const category = typeof body.category === "string" && ALLOWED_CATEGORIES.includes(body.category) ? body.category : undefined;
  const brand = typeof body.brand === "string" && body.brand.trim() ? body.brand.trim() : undefined;
  const model = typeof body.model === "string" && body.model.trim() ? body.model.trim() : undefined;
  const title = typeof body.title === "string" ? body.title.trim() || null : undefined;
  const condition = typeof body.condition === "string" && ALLOWED_CONDITIONS.includes(body.condition) ? body.condition : undefined;
  const description = typeof body.description === "string" ? body.description.trim() || null : undefined;
  const price = typeof body.price === "number" ? body.price : typeof body.price === "string" ? parseInt(String(body.price), 10) : undefined;
  const shaft = typeof body.shaft === "string" ? body.shaft.trim() || null : undefined;
  const degree = typeof body.degree === "string" ? body.degree.trim() || null : undefined;
  const shaft_flex = typeof body.shaft_flex === "string" ? body.shaft_flex.trim() || null : undefined;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (category !== undefined) {
    updates.category = category;
    updates.parcel_preset = categoryToParcelPreset(category);
  }
  if (brand !== undefined) updates.brand = brand;
  if (model !== undefined) updates.model = model;
  if (title !== undefined) updates.title = title;
  if (condition !== undefined) updates.condition = condition;
  if (description !== undefined) updates.description = description;
  if (typeof price === "number" && Number.isFinite(price) && price > 0) updates.price = price;
  if (shaft !== undefined) updates.shaft = shaft;
  if (degree !== undefined) updates.degree = degree;
  if (shaft_flex !== undefined) updates.shaft_flex = shaft_flex;
  // Optionally clear admin feedback when seller resubmits
  if (Object.keys(updates).length > 1) updates.admin_feedback = null;

  const { error } = await admin.from("listings").update(updates).eq("id", id).eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
