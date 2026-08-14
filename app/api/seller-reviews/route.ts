import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import {
  createSellerReview,
  parseRating,
  sanitizeReviewText,
  FEEDBACK_EVENTS,
} from "@/lib/seller-reviews";
import {
  notifySellerNewFeedback,
  resolveBuyerFeedbackRequest,
} from "@/lib/seller-review-events";
import { trackServerEvent } from "@/lib/starter-pack";

export const dynamic = "force-dynamic";

/**
 * POST /api/seller-reviews
 * Body: { transactionId, rating, reviewText? }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const transactionId = typeof body.transactionId === "string" ? body.transactionId : "";
  const rating = parseRating(body.rating);
  const reviewText = sanitizeReviewText(body.reviewText);
  if (!transactionId) {
    return NextResponse.json({ error: "transactionId is required" }, { status: 400 });
  }
  if (rating == null) {
    return NextResponse.json({ error: "Please choose a rating between 1 and 5 stars" }, { status: 400 });
  }

  const admin = createAdminClient();
  const result = await createSellerReview(admin, {
    transactionId,
    buyerUserId: user.id,
    rating,
    reviewText,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  await resolveBuyerFeedbackRequest(admin, {
    transactionId,
    buyerId: user.id,
  });
  await notifySellerNewFeedback(admin, result.review);
  await trackServerEvent(admin, FEEDBACK_EVENTS.SUBMITTED, {
    userId: user.id,
    properties: {
      transaction_id: transactionId,
      review_id: result.review.id,
      rating,
      has_text: !!reviewText,
    },
  });
  if (reviewText) {
    await trackServerEvent(admin, FEEDBACK_EVENTS.WITH_TEXT_SUBMITTED, {
      userId: user.id,
      properties: { review_id: result.review.id },
    });
  }

  return NextResponse.json({ review: result.review });
}
