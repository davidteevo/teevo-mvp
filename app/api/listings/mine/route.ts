import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const archivedOnly = searchParams.get("archived") === "1";

  let query = supabase
    .from("listings")
    .select("id, category, brand, model, title, condition, description, price, shaft, degree, shaft_flex, lie_angle, club_length, shaft_weight, shaft_material, grip_brand, grip_model, grip_size, grip_condition, handed, listing_format, standard_spec_status, customised_aspects, customised_other_note, iron_number, set_composition, bounce, grind, head_number, headcover_included, hosel_serial_status, status, created_at, admin_feedback, archived_at, availability_confirmation_status, availability_confirmation_source, buying_paused, listing_images ( id, storage_path, sort_order, visibility, image_type, slot_key, storage_bucket ), listing_clubs ( id, listing_id, sort_order, club_type, iron_number, degree, bounce, grind, shaft, shaft_flex, created_at )")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (archivedOnly) {
    query = query.not("archived_at", "is", null);
  } else {
    query = query.is("archived_at", null);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ listings: data ?? [] });
}
