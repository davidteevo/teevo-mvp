import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications/action-count
 * Returns the count of outstanding actionable notifications for the current seller.
 * Only counts seller-relevant types to avoid surfacing buyer/admin actions.
 */
const SELLER_ACTION_TYPES = [
  "item_sold",
  "packaging_rejected",
  "shipping_label_ready",
  "ready_to_ship",
  "confirm_listing_availability",
  "reconfirm_listing_availability",
  "dispatch_reminder",
  "dispatch_one_day_left",
  "dispatch_required_today",
  "seller_payout_failed",
  "seller_payout_account_issue",
  "stripe_payouts_setup_required",
  "starter_pack_dispatched",
];

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("requires_action", true)
    .is("action_completed_at", null)
    .in("type", SELLER_ACTION_TYPES);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ count: count ?? 0 });
}
