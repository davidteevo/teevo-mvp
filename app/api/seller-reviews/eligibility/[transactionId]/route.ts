import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { loadFeedbackFormContext } from "@/lib/seller-reviews";

export const dynamic = "force-dynamic";

/**
 * GET /api/seller-reviews/eligibility/[transactionId]
 * Buyer-only bootstrap for the leave-feedback form.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  const { transactionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const ctx = await loadFeedbackFormContext(admin, {
    transactionId,
    buyerUserId: user.id,
  });
  if (!ctx.ok) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  return NextResponse.json({
    transaction_id: ctx.tx.id,
    can_create: ctx.canCreate,
    can_edit: ctx.canEdit,
    seller: ctx.seller,
    listing: ctx.listing,
    existing: ctx.existing
      ? {
          id: ctx.existing.id,
          rating: ctx.existing.rating,
          review_text: ctx.existing.review_text,
          editable_until: ctx.existing.editable_until,
          status: ctx.existing.status,
          created_at: ctx.existing.created_at,
        }
      : null,
  });
}
