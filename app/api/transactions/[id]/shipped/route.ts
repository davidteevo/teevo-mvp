import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  FulfilmentStatus,
  getBuyerTrackingCta,
  getTrackingNumber,
} from "@/lib/fulfilment";
import { ensureEmailSent, EmailTriggerType, getListingEmailContext } from "@/lib/email-triggers";
import { getAppUrl } from "@/lib/app-env";
import { notifyItemDispatched } from "@/lib/notification-events";
import { isCancellationBlockingDispatch } from "@/lib/dispatch-deadline";
import { markExtensionSupersededOnDispatch } from "@/lib/dispatch-timeout";
import { recordTransactionEvent, TransactionEventType } from "@/lib/transaction-events";
import { trackServerEvent } from "@/lib/starter-pack";

const appUrl = getAppUrl();

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

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: tx } = await admin
    .from("transactions")
    .select(
      "seller_id, buyer_id, listing_id, status, cancellation_status, dispatch_extension_status, fulfilment_mode, shippo_tracking_number, courier, tracking_number, tracking_url"
    )
    .eq("id", id)
    .single();

  if (!tx || tx.seller_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (tx.status !== "pending" || isCancellationBlockingDispatch(tx.cancellation_status)) {
    return NextResponse.json({ error: "Already shipped or complete" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await admin
    .from("transactions")
    .update({
      status: "shipped",
      order_state: "shipped",
      fulfilment_status: FulfilmentStatus.SHIPPED,
      shipped_at: now,
      updated_at: now,
    })
    .eq("id", id)
    .eq("status", "pending")
    .or("cancellation_status.is.null,cancellation_status.eq.failed")
    .is("shipped_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: "Already shipped or complete" }, { status: 400 });
  }

  await markExtensionSupersededOnDispatch(admin, { id, dispatch_extension_status: tx.dispatch_extension_status });
  await recordTransactionEvent(admin, {
    transactionId: id,
    eventType: TransactionEventType.SELLER_DISPATCHED,
    actorId: user.id,
    payload: { source: "seller" },
  });
  await trackServerEvent(admin, "seller_dispatched", {
    userId: user.id,
    properties: { transaction_id: id, listing_id: tx.listing_id },
  });

  const { data: buyer } = await admin.from("users").select("email").eq("id", tx.buyer_id).single();
  const { data: seller } = await admin.from("users").select("email").eq("id", tx.seller_id).single();
  const { itemName, hero_image } = await getListingEmailContext(admin, tx.listing_id);
  const orderShort = id.slice(0, 8);
  const trackingNumber = getTrackingNumber(tx);
  const trackingLink = getBuyerTrackingCta(tx);

  if (buyer?.email) {
    const bodyLines = [];
    if (tx.courier) bodyLines.push(`Courier: ${tx.courier}`);
    if (trackingNumber) bodyLines.push(`Tracking number: ${trackingNumber}`);

    await ensureEmailSent(admin, {
      emailType: EmailTriggerType.SHIPPING_CONFIRMATION,
      referenceId: id,
      recipientId: tx.buyer_id,
      to: buyer.email,
      subject: `\uD83D\uDCE6 Your Teevo order is on the move!`,
      type: "transactional",
      variables: {
        title: "Your order is on its way",
        subtitle: "Great news \u2014 your club has been dispatched.",
        body: bodyLines.join("\n"),
        order_number: orderShort,
        item_name: itemName,
        hero_image,
        cta_link: trackingLink,
        cta_text: "Track your order",
      },
    }).catch((e) => console.error("Shipping confirmation email failed", e));
  }

  if (seller?.email) {
    await ensureEmailSent(admin, {
      emailType: EmailTriggerType.ITEM_DISPATCHED,
      referenceId: id,
      recipientId: tx.seller_id,
      to: seller.email,
      subject: `\uD83D\uDE9A Your item is on its way!`,
      type: "transactional",
      variables: {
        title: "Your item has been dispatched",
        subtitle: "Nice work \u2014 the buyer will be notified.",
        body: `Your ${itemName} is now on its way to its new owner. We\u2019ll keep you updated and release your funds once delivery is confirmed.`,
        order_number: orderShort,
        item_name: itemName,
        hero_image,
        cta_link: `${appUrl}/dashboard/sales`,
        cta_text: "View your sale",
      },
    }).catch((e) => console.error("Item dispatched email failed", e));
  }

  await notifyItemDispatched(admin, {
    transactionId: id,
    listingId: tx.listing_id,
    sellerId: tx.seller_id,
    buyerId: tx.buyer_id,
    fulfilmentMode: tx.fulfilment_mode,
  });

  return NextResponse.json({ ok: true });
}
