import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createTransactionAndSendEmails } from "@/lib/checkout-complete";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

function getPaymentIntentId(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "id" in value && typeof (value as { id: unknown }).id === "string") {
    return (value as { id: string }).id;
  }
  return undefined;
}

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
    try {
      await createTransactionAndSendEmails(admin, session);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Processing failed";
      console.error("Stripe webhook: checkout.session.completed failed", err);
      return NextResponse.json(
        { error: "Processing failed", detail: message },
        { status: 500 }
      );
    }
  }

  if (event.type === "charge.dispute.created") {
    const dispute = event.data.object as Stripe.Dispute;
    const paymentIntentId = getPaymentIntentId(dispute.payment_intent);
    if (paymentIntentId) {
      await admin
        .from("transactions")
        .update({ status: "dispute", updated_at: new Date().toISOString() })
        .eq("stripe_payment_id", paymentIntentId);
    }
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId = getPaymentIntentId(charge.payment_intent);
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
      const paymentIntentId = getPaymentIntentId(charge.payment_intent);
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
