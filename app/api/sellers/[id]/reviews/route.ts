import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { SellerReviewStatus } from "@/lib/seller-reviews";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

/**
 * GET /api/sellers/[id]/reviews?cursor=
 * Authenticated users only — detailed review bodies.
 */
export async function GET(
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

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const admin = createAdminClient();

  let query = admin
    .from("seller_reviews")
    .select("id, rating, review_text, listing_title_snapshot, listing_id, created_at, transaction_id")
    .eq("seller_id", id)
    .eq("status", SellerReviewStatus.ACTIVE)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const nextCursor = hasMore ? page[page.length - 1]?.created_at ?? null : null;

  return NextResponse.json({
    reviews: page.map((r) => ({
      id: r.id,
      rating: r.rating,
      review_text: r.review_text,
      listing_title: r.listing_title_snapshot,
      listing_id: r.listing_id,
      created_at: r.created_at,
      verified_purchase: true,
    })),
    next_cursor: nextCursor,
  });
}
