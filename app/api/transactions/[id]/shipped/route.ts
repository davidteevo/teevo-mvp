import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { FulfilmentStatus } from "@/lib/fulfilment";
import { ensureEmailSent, EmailTriggerType } from "@/lib/email-triggers";

const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://app.teevohq.com";

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
    .select("seller_id, buyer_id, listing_id, status, shippo_tracking_number")
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
  const { data: listing } = await admin.from("listings").select("brand, model").eq("id", tx.listing_id).single();
  const itemName = listing ? `${listing.brand} ${listing.model}` : "Your item";
  const trackingLink = tx.shippo_tracking_number
    ? `https://track.dpd.co.uk/status/${tx.shippo_tracking_number}`
    : `${appUrl}/dashboard/purchases`;
  if (buyer?.email) {
    await ensureEmailSent(admin, {
      emailType: EmailTriggerType.SHIPPING_CONFIRMATION,
      referenceId: id,
      recipientId: tx.buyer_id,
      to: buyer.email,
      subject: `Shipped: ${itemName}`,
      type: "transactional",
      variables: {
        title: "Your order has shipped",
        subtitle: "Track your delivery below.",
        body: `Order #${id.slice(0, 8)} · ${itemName}`,
        order_number: id.slice(0, 8),
        cta_link: trackingLink,
        cta_text: "Track delivery",
      },
    }).catch((e) => console.error("Shipping confirmation email failed", e));
  }
  return NextResponse.json({ ok: true });
}
