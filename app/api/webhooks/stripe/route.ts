import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { ShippingService, type ShippingServiceType } from "@/lib/shippo";
import { SHIPPING_FEE_GBP, FulfilmentStatus } from "@/lib/fulfilment";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const listingId = session.metadata?.listingId;
    const buyerId = session.metadata?.buyerId;
    const sellerId = session.metadata?.sellerId;
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

    if (listingId && buyerId && sellerId) {
      const amount = session.amount_total ?? 0;
      const addr = session.customer_details?.address;
      const buyerName = session.customer_details?.name ?? (session as { shipping_details?: { name?: string } }).shipping_details?.name ?? null;
      const rawShipping = session.metadata?.shippingOption ?? session.metadata?.shipping_service;
      const validServices: ShippingServiceType[] = [ShippingService.DPD_NEXT_DAY, ShippingService.DPD_SHIP_TO_SHOP];
      const shipping_service =
        typeof rawShipping === "string" && validServices.includes(rawShipping as ShippingServiceType)
          ? (rawShipping as ShippingServiceType)
          : ShippingService.DPD_NEXT_DAY;
      await admin.from("transactions").insert({
        listing_id: listingId,
        buyer_id: buyerId,
        seller_id: sellerId,
        stripe_payment_id: paymentIntentId ?? null,
        stripe_checkout_session_id: session.id,
        amount,
        status: "pending",
        order_state: "paid",
        fulfilment_status: FulfilmentStatus.PAID,
        buyer_postcode: addr?.postal_code ?? session.metadata?.buyerPostcode ?? null,
        shipping_option: session.metadata?.shippingOption ?? null,
        shipping_service,
        shipping_fee_gbp: SHIPPING_FEE_GBP,
        buyer_name: buyerName,
        buyer_address_line1: addr?.line1 ?? null,
        buyer_address_line2: addr?.line2 ?? null,
        buyer_city: addr?.city ?? null,
        buyer_country: addr?.country ?? null,
      });
      await admin.from("listings").update({ status: "sold", updated_at: new Date().toISOString() }).eq("id", listingId);
    }
  }

  if (event.type === "charge.dispute.created") {
    const dispute = event.data.object as Stripe.Dispute;
    const paymentIntentId =
      typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id;
    if (paymentIntentId) {
      await admin
        .from("transactions")
        .update({ status: "dispute", updated_at: new Date().toISOString() })
        .eq("stripe_payment_id", paymentIntentId);
    }
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId = charge.payment_intent;
    if (paymentIntentId) {
      await admin
        .from("transactions")
        .update({ status: "refunded", updated_at: new Date().toISOString() })
        .eq("stripe_payment_id", paymentIntentId);
    }
  }

  if (event.type === "refund.updated") {
    const refund = event.data.object as Stripe.Refund;
    const chargeId = refund.charge;
    if (chargeId && refund.status === "succeeded") {
      const charge = await stripe.charges.retrieve(chargeId as string);
      const paymentIntentId = charge.payment_intent;
      if (paymentIntentId) {
        await admin
          .from("transactions")
          .update({ status: "refunded", updated_at: new Date().toISOString() })
          .eq("stripe_payment_id", paymentIntentId);
      }
    }
  }

  return NextResponse.json({ received: true });
}
