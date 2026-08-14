import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import {
  FEEDBACK_EVENTS,
  isReviewReportReason,
  reportSellerReview,
  REVIEW_TEXT_MAX,
} from "@/lib/seller-reviews";
import { notifyAdminFeedbackRequiresReview } from "@/lib/seller-review-events";
import { trackServerEvent } from "@/lib/starter-pack";

export const dynamic = "force-dynamic";

/**
 * POST /api/seller-reviews/[id]/report
 * Body: { reason, details? }
 */
export async function POST(
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
  if (!isReviewReportReason(body.reason)) {
    return NextResponse.json({ error: "Please choose a report reason" }, { status: 400 });
  }
  const details =
    typeof body.details === "string" ? body.details.trim().slice(0, REVIEW_TEXT_MAX) : null;

  const admin = createAdminClient();
  const result = await reportSellerReview(admin, {
    reviewId: id,
    reporterId: user.id,
    reason: body.reason,
    details,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  await trackServerEvent(admin, FEEDBACK_EVENTS.REPORTED, {
    userId: user.id,
    properties: { review_id: id, reason: body.reason },
  });

  if (result.firstOpenReport) {
    await notifyAdminFeedbackRequiresReview(admin, {
      review: result.review,
      reason: body.reason,
      reporterId: user.id,
    });
  }

  return NextResponse.json({ ok: true });
}
