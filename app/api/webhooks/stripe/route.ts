import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { ShippingService, type ShippingServiceType } from "@/lib/shippo";
import { SHIPPING_FEE_GBP, FulfilmentStatus } from "@/lib/fulfilment";
import { ensureEmailSent, EmailTriggerType, formatGbp } from "@/lib/email-triggers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://app.teevohq.com";

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
      const { data: existingTx } = await admin
        .from("transactions")
        .select("id")
        .eq("stripe_checkout_session_id", session.id)
        .maybeSingle();
      if (existingTx) {
        return NextResponse.json({ received: true });
      }

      const amount = session.amount_total ?? 0;
      const addr = session.customer_details?.address;
      const buyerName = session.customer_details?.name ?? (session as { shipping_details?: { name?: string } }).shipping_details?.name ?? null;
      const rawShipping = session.metadata?.shippingOption ?? session.metadata?.shipping_service;
      const validServices: ShippingServiceType[] = [ShippingService.DPD_NEXT_DAY, ShippingService.DPD_SHIP_TO_SHOP];
      const shipping_service =
        typeof rawShipping === "string" && validServices.includes(rawShipping as ShippingServiceType)
          ? (rawShipping as ShippingServiceType)
          : ShippingService.DPD_NEXT_DAY;
      const { data: newTx, error: insertErr } = await admin
        .from("transactions")
        .insert({
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
        })
        .select("id, listing_id, buyer_id, seller_id, amount")
        .single();

      if (insertErr || !newTx) {
        console.error("Stripe webhook: transaction insert failed", insertErr);
        return NextResponse.json({ error: "Insert failed" }, { status: 500 });
      }
      await admin.from("listings").update({ status: "sold", updated_at: new Date().toISOString() }).eq("id", listingId);

      const txId = newTx.id;
      const totalGbp = formatGbp(amount);
      const shippingGbp = SHIPPING_FEE_GBP.toFixed(2);
      const { data: listing } = await admin.from("listings").select("brand, model").eq("id", listingId).single();
      const itemName = listing ? `${listing.brand} ${listing.model}` : "Your item";
      const { data: buyer } = await admin.from("users").select("email").eq("id", buyerId).single();
      const { data: seller } = await admin.from("users").select("email").eq("id", sellerId).single();
      const buyerEmail = buyer?.email ?? null;
      const sellerEmail = seller?.email ?? null;

      const orderLink = `${appUrl}/dashboard/purchases`;
      const salesLink = `${appUrl}/dashboard/sales`;

      if (buyerEmail) {
        await ensureEmailSent(admin, {
          emailType: EmailTriggerType.ORDER_CONFIRMATION,
          referenceId: txId,
          recipientId: buyerId,
          to: buyerEmail,
          subject: `Order confirmed – ${itemName}`,
          type: "transactional",
          variables: {
            title: "Order confirmed",
            subtitle: "Funds are held securely until delivery is confirmed.",
            body: `Item: ${itemName}<br />Total: £${totalGbp}<br />Shipping: £${shippingGbp}`,
            order_number: txId.slice(0, 8),
            cta_link: orderLink,
            cta_text: "View order",
          },
        }).catch((e) => console.error("Order confirmation email failed", e));
      }
      if (sellerEmail) {
        await ensureEmailSent(admin, {
          emailType: EmailTriggerType.ITEM_SOLD,
          referenceId: txId,
          recipientId: sellerId,
          to: sellerEmail,
          subject: `You've sold ${itemName} 🥳`,
          type: "transactional",
          variables: {
            title: "Item sold",
            subtitle: "Pack the item and complete packaging to get your label.",
            body: `Order #${txId.slice(0, 8)} · ${itemName} · £${totalGbp}`,
            order_number: txId.slice(0, 8),
            cta_link: salesLink,
            cta_text: "View sale",
          },
        }).catch((e) => console.error("Item sold email failed", e));
        await ensureEmailSent(admin, {
          emailType: EmailTriggerType.PAYMENT_RECEIVED,
          referenceId: txId,
          recipientId: sellerId,
          to: sellerEmail,
          subject: "Payment received",
          type: "transactional",
          variables: {
            title: "Payment received",
            subtitle: "Funds are held securely until delivery is confirmed.",
            body: `Order #${txId.slice(0, 8)} · ${itemName}<br />Total: £${totalGbp}<br />Shipping: £${shippingGbp}`,
            order_number: txId.slice(0, 8),
            cta_link: salesLink,
            cta_text: "View order",
          },
        }).catch((e) => console.error("Payment received email failed", e));
      }
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
    const raw = charge.payment_intent;
    const paymentIntentId = typeof raw === "string" ? raw : (raw as { id?: string })?.id;
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
      const raw = charge.payment_intent;
      const paymentIntentId = typeof raw === "string" ? raw : (raw as { id?: string })?.id;
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
