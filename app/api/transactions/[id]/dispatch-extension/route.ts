import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { canRequestDispatchExtension, DispatchExtensionStatus } from "@/lib/dispatch-deadline";
import { getDispatchExtensionBusinessDays, getDispatchMaxExtensions } from "@/lib/dispatch-settings";
import { notifyDispatchExtensionRequested } from "@/lib/dispatch-notifications";
import { recordTransactionEvent, TransactionEventType } from "@/lib/transaction-events";
import { trackServerEvent } from "@/lib/starter-pack";

export const dynamic = "force-dynamic";

/**
 * POST /api/transactions/[id]/dispatch-extension
 * Seller requests one 3-calendar-day extension (buyer must approve).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: tx } = await admin
    .from("transactions")
    .select(
      "id, seller_id, buyer_id, listing_id, status, shipped_at, cancellation_status, dispatch_deadline_at, dispatch_extension_status"
    )
    .eq("id", id)
    .maybeSingle();

  if (!tx) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  if (tx.seller_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const maxExtensions = await getDispatchMaxExtensions(admin);
  if (maxExtensions < 1) {
    return NextResponse.json({ error: "Extensions are not available" }, { status: 400 });
  }
  if (!canRequestDispatchExtension(tx)) {
    if (tx.dispatch_extension_status) {
      return NextResponse.json({ error: "An extension has already been requested for this order" }, { status: 400 });
    }
    if (!tx.dispatch_deadline_at || new Date(tx.dispatch_deadline_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: "The dispatch deadline has already passed" }, { status: 400 });
    }
    return NextResponse.json({ error: "You can't request more time for this order" }, { status: 400 });
  }

  const extraDays = await getDispatchExtensionBusinessDays(admin);
  const now = new Date().toISOString();
  const { data: updated, error } = await admin
    .from("transactions")
    .update({
      dispatch_extension_status: DispatchExtensionStatus.REQUESTED,
      dispatch_extension_requested_at: now,
      dispatch_extension_business_days: extraDays,
      updated_at: now,
    })
    .eq("id", id)
    .eq("seller_id", user.id)
    .eq("status", "pending")
    .is("shipped_at", null)
    .is("dispatch_extension_status", null)
    .select("id, dispatch_extension_status, dispatch_extension_requested_at, dispatch_extension_business_days")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated) {
    return NextResponse.json({ error: "An extension has already been requested for this order" }, { status: 400 });
  }

  await recordTransactionEvent(admin, {
    transactionId: id,
    eventType: TransactionEventType.EXTENSION_REQUESTED,
    actorId: user.id,
    payload: { extra_business_days: extraDays },
  });
  await trackServerEvent(admin, "dispatch_extension_requested", {
    userId: user.id,
    properties: { transaction_id: id, extra_business_days: extraDays },
  });
  await notifyDispatchExtensionRequested(admin, {
    transactionId: id,
    listingId: tx.listing_id,
    buyerId: tx.buyer_id,
    extraBusinessDays: extraDays,
  });

  return NextResponse.json({ ok: true, ...updated });
}
