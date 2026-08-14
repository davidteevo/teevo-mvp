import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { resolveNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = [
  "delivery_issue_reported",
  "refund_requires_action",
  "shipping_label_issue",
  "seller_not_dispatched",
  "delivery_overdue",
  "tracking_issue",
  "buyer_not_confirmed",
  "funds_release_requires_action",
  "seller_payout_failed",
  "seller_payout_account_issue",
  "payment_issue_requires_review",
  "transaction_stuck",
  "dispatch_cancellation_failed",
] as const;

/**
 * POST /api/admin/transactions/[id]/resolve-ops-issue
 * Body: { types?: string[] } — resolve listed admin notification types (or a default ops set).
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

  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const requested = Array.isArray(body.types)
    ? (body.types as unknown[]).filter((t): t is string => typeof t === "string")
    : [...ALLOWED_TYPES];
  const types = requested.filter((t) => (ALLOWED_TYPES as readonly string[]).includes(t));
  if (!types.length) {
    return NextResponse.json({ error: "No valid types" }, { status: 400 });
  }

  const now = new Date().toISOString();
  if (types.includes("delivery_issue_reported")) {
    await admin
      .from("transactions")
      .update({ delivery_issue_resolved_at: now, updated_at: now })
      .eq("id", id)
      .is("delivery_issue_resolved_at", null);
  }

  const resolved = await resolveNotifications(admin, { types, entityId: id });
  return NextResponse.json({ ok: true, resolved });
}
