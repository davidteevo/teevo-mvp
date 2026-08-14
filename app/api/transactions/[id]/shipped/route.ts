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
      "seller_id, buyer_id, listing_id, status, fulfilment_mode, shippo_tracking_number, courier, tracking_number, tracking_url"
    )
    .eq("id", id)
    .single();

  if (!tx || tx.seller_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (tx.status !== "pending") {
    return NextResponse.json({ error: "Already shipped or complete" }, { status: 400 });
  }

  const { error } = await admin
    .from("transactions")
    .update({
      status: "shipped",
      order_state: "shipped",
      fulfilment_status: FulfilmentStatus.SHIPPED,
      shipped_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: buyer } = await admin.from("users").select("email").eq("id", tx.buyer_id).single();
  const { data: seller } = await admin.from("users").select("email").eq("id", tx.seller_id).single();
  const { itemName, hero_image } = await getListingEmailContext(admin, tx.listing_id);
  const orderShort = id.slice(0, 8);
  const trackingNumber = getTrackingNumber(tx);
  const trackingLink = getBuyerTrackingCta(tx);

  if (buyer?.email) {
    const bodyLines = [
      `Order #${orderShort} · ${itemName}`,
      ``,
      `Your order is on its way.`,
    ];
    if (tx.courier) bodyLines.push(`Courier: ${tx.courier}`);
    if (trackingNumber) bodyLines.push(`Tracking number: ${trackingNumber}`);

    await ensureEmailSent(admin, {
      emailType: EmailTriggerType.SHIPPING_CONFIRMATION,
      referenceId: id,
      recipientId: tx.buyer_id,
      to: buyer.email,
      subject: `Your Teevo order has been dispatched`,
      type: "transactional",
      variables: {
        title: "Your order has been dispatched",
        subtitle: "Your order is on its way.",
        body: bodyLines.join("\n"),
        order_number: orderShort,
        hero_image,
        cta_link: trackingLink,
        cta_text: "Track Parcel",
      },
    }).catch((e) => console.error("Shipping confirmation email failed", e));
  }

  if (seller?.email) {
    await ensureEmailSent(admin, {
      emailType: EmailTriggerType.ITEM_DISPATCHED,
      referenceId: id,
      recipientId: tx.seller_id,
      to: seller.email,
      subject: `Your item has now been dispatched`,
      type: "transactional",
      variables: {
        title: "Item dispatched",
        subtitle: "Your item has now been dispatched.",
        body: `Order #${orderShort} · ${itemName}`,
        order_number: orderShort,
        hero_image,
        cta_link: `${appUrl}/dashboard/sales`,
        cta_text: "View sales",
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
