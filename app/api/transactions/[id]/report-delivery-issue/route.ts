import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { notifyDeliveryIssueReported } from "@/lib/notification-events";
import { trackServerEvent } from "@/lib/starter-pack";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
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
  const { data: tx } = await admin
    .from("transactions")
    .select(
      "id, buyer_id, seller_id, listing_id, status, order_state, fulfilment_status, fulfilment_mode, delivery_issue_reported_at, buyer_confirmed_at, completed_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (!tx || tx.buyer_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (tx.status === "complete" || tx.buyer_confirmed_at || tx.completed_at) {
    return NextResponse.json({ error: "This order is already complete" }, { status: 400 });
  }
  if (tx.delivery_issue_reported_at) {
    return NextResponse.json({ ok: true, already_reported: true });
  }
  if (tx.status === "refunded" || tx.status === "dispute") {
    return NextResponse.json({ error: "This order cannot be updated" }, { status: 400 });
  }
  const shippedOrDelivered =
    tx.status === "shipped" ||
    tx.fulfilment_status === "SHIPPED" ||
    tx.fulfilment_status === "DELIVERED" ||
    tx.order_state === "shipped" ||
    tx.order_state === "delivered";
  if (!shippedOrDelivered) {
    return NextResponse.json(
      { error: "You can report a problem after the item has been dispatched" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from("transactions")
    .update({
      delivery_issue_reported_at: now,
      updated_at: now,
    })
    .eq("id", id)
    .is("delivery_issue_reported_at", null)
    .neq("status", "complete");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await notifyDeliveryIssueReported(admin, {
    transactionId: id,
    listingId: tx.listing_id,
    buyerId: tx.buyer_id,
    sellerId: tx.seller_id,
  });

  await trackServerEvent(admin, "buyer_delivery_issue_selected", {
    userId: user.id,
    properties: { entity_type: "transaction", entity_id: id },
  });

  return NextResponse.json({ ok: true });
}
