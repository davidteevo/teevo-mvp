import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/**
 * POST /api/listings
 * Body: JSON { category, brand, model, condition, description?, price (pence), imageCount (3–6) }
 * Creates the listing row only. Client uploads images directly to Supabase Storage, then calls POST /api/listings/[id]/images.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const category = body.category as string;
    const brand = body.brand as string;
    const model = body.model as string;
    const condition = body.condition as string;
    const description = (body.description as string) || null;
    const price = typeof body.price === "number" ? body.price : parseInt(String(body.price), 10);
    const imageCount = typeof body.imageCount === "number" ? body.imageCount : parseInt(String(body.imageCount), 10);

    const allowedCategories = ["Driver", "Irons", "Wedges", "Putter", "Apparel", "Bag"];
    const allowedConditions = ["New", "Excellent", "Good", "Used"];
    if (
      !category ||
      !allowedCategories.includes(category) ||
      !brand ||
      !model ||
      !condition ||
      !allowedConditions.includes(condition) ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      return NextResponse.json({ error: "Invalid fields" }, { status: 400 });
    }
    if (!Number.isFinite(imageCount) || imageCount < 3 || imageCount > 6) {
      return NextResponse.json({ error: "Upload 3–6 images" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: listing, error: listError } = await admin
      .from("listings")
      .insert({
        user_id: user.id,
        category,
        brand,
        model,
        condition,
        description,
        price,
        status: "pending",
      })
      .select("id")
      .single();

    if (listError || !listing) {
      return NextResponse.json({ error: listError?.message ?? "Failed to create listing" }, { status: 500 });
    }

    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      await admin.from("users").update({ role: "seller", updated_at: new Date().toISOString() }).eq("id", user.id);
    }

    return NextResponse.json({ id: listing.id });
  } catch (e) {
    console.error("Listings POST error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong. Try again." },
      { status: 500 }
    );
  }
}
