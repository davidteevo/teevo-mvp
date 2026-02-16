import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { NextResponse } from "next/server";

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
      await admin.from("transactions").insert({
        listing_id: listingId,
        buyer_id: buyerId,
        seller_id: sellerId,
        stripe_payment_id: paymentIntentId ?? null,
        stripe_checkout_session_id: session.id,
        amount,
        status: "pending",
        order_state: "paid",
        buyer_postcode: session.metadata?.buyerPostcode ?? null,
        shipping_option: session.metadata?.shippingOption ?? null,
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
