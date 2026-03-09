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
    .select("id, category, brand, model, title, condition, price, shaft, degree, shaft_flex, status, created_at, admin_feedback, archived_at, listing_images ( id, storage_path, sort_order )")
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
