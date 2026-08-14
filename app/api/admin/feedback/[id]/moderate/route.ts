import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { isModerationAction, moderateSellerReview } from "@/lib/seller-reviews";
import {
  resolveAdminFeedbackNotifications,
  trackFeedbackModerated,
} from "@/lib/seller-review-events";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/feedback/[id]/moderate
 * Body: { action: keep|hide|restore|remove, reason? }
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
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  if (!isModerationAction(body.action)) {
    return NextResponse.json({ error: "Invalid moderation action" }, { status: 400 });
  }
  const reason = typeof body.reason === "string" ? body.reason.trim() : null;

  const result = await moderateSellerReview(admin, {
    reviewId: id,
    adminId: user.id,
    action: body.action,
    reason,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  await resolveAdminFeedbackNotifications(admin, id);
  await trackFeedbackModerated(admin, {
    adminId: user.id,
    reviewId: id,
    action: body.action,
  });

  return NextResponse.json({ review: result.review });
}
