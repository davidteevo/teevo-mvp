import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { parseRating, sanitizeReviewText, updateSellerReview } from "@/lib/seller-reviews";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/seller-reviews/[id]
 * Buyer edit within the 48-hour window.
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

  const body = await request.json().catch(() => ({}));
  const rating = body.rating !== undefined ? parseRating(body.rating) : undefined;
  if (body.rating !== undefined && rating == null) {
    return NextResponse.json({ error: "Please choose a rating between 1 and 5 stars" }, { status: 400 });
  }
  const reviewText = body.reviewText !== undefined ? sanitizeReviewText(body.reviewText) : undefined;

  const admin = createAdminClient();
  const result = await updateSellerReview(admin, {
    reviewId: id,
    buyerUserId: user.id,
    ...(rating != null ? { rating } : {}),
    ...(body.reviewText !== undefined ? { reviewText } : {}),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ review: result.review });
}
