import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { addWatchlistItem } from "@/lib/watchlist";

export const dynamic = "force-dynamic";

/**
 * GET /api/watchlist
 * Current user's Watchlist with listing details (including sold/unavailable).
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("watchlist_items")
    .select(
      "id, listing_id, created_at, listings(id, user_id, category, brand, model, title, condition, description, price, shaft, degree, shaft_flex, lie_angle, club_length, shaft_weight, shaft_material, grip_brand, grip_model, grip_size, grip_condition, handed, item_type, size, colour, status, archived_at, created_at, listing_images(id, storage_path, sort_order), users!user_id(display_name))"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (rows ?? [])
    .map((row) => {
      const listingRel = row.listings as unknown;
      const listing = Array.isArray(listingRel) ? listingRel[0] : listingRel;
      if (!listing) return null;
      return {
        id: row.id,
        listing_id: row.listing_id,
        created_at: row.created_at,
        listing,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ items });
}

/**
 * POST /api/watchlist
 * Body: { listingId: string }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { listingId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const listingId = typeof body.listingId === "string" ? body.listingId : "";
  const admin = createAdminClient();
  const result = await addWatchlistItem(admin, user.id, listingId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.httpStatus });
  }
  return NextResponse.json({ ok: true, created: result.created });
}
