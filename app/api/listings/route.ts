import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const category = formData.get("category") as string;
  const brand = formData.get("brand") as string;
  const model = formData.get("model") as string;
  const condition = formData.get("condition") as string;
  const description = (formData.get("description") as string) || null;
  const price = parseInt(formData.get("price") as string, 10);

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

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

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

  const images = formData.getAll("images") as File[];
  if (images.length < 3 || images.length > 6) {
    return NextResponse.json({ error: "Upload 3–6 images" }, { status: 400 });
  }

  const storage = admin.storage.from("listings");
  for (let i = 0; i < images.length; i++) {
    const file = images[i];
    if (!file?.size) continue;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${listing.id}/${i}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    await storage.upload(path, buf, { contentType: file.type, upsert: true });
    await admin.from("listing_images").insert({
      listing_id: listing.id,
      sort_order: i,
      storage_path: path,
    });
  }

  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    await admin.from("users").update({ role: "seller", updated_at: new Date().toISOString() }).eq("id", user.id);
  }

  return NextResponse.json({ id: listing.id });
}
