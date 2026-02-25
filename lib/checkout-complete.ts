import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { ShippingService, type ShippingServiceType } from "@/lib/shippo";
import { SHIPPING_FEE_GBP, FulfilmentStatus } from "@/lib/fulfilment";
import { ensureEmailSent, EmailTriggerType, formatGbp } from "@/lib/email-triggers";

const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://app.teevohq.com";

function getPaymentIntentId(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "id" in value && typeof (value as { id: unknown }).id === "string") {
    return (value as { id: string }).id;
  }
  return undefined;
}

/**
 * Idempotent: creates transaction from a Stripe Checkout Session (if not already created),
 * marks listing as sold, and sends order confirmation + item sold + payment received emails.
 * Used by both the Stripe webhook and the success-page fallback when the webhook hasn't run.
 */
export async function createTransactionAndSendEmails(
  admin: SupabaseClient,
  session: Stripe.Checkout.Session
): Promise<{ transactionId: string } | { alreadyExists: true }> {
  const listingId = session.metadata?.listingId;
  const buyerId = session.metadata?.buyerId;
  const sellerId = session.metadata?.sellerId;
  if (!listingId || !buyerId || !sellerId) {
    throw new Error("Missing session metadata: listingId, buyerId, or sellerId");
  }

  const { data: existingTx } = await admin
    .from("transactions")
    .select("id")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();
  if (existingTx) {
    return { alreadyExists: true };
  }

  const paymentIntentId = getPaymentIntentId(session.payment_intent);
  const amount = session.amount_total ?? 0;
  const addr = session.customer_details?.address;
  const buyerName =
    session.customer_details?.name ??
    (session as { shipping_details?: { name?: string } }).shipping_details?.name ??
    null;
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
    throw new Error(insertErr?.message ?? "Transaction insert failed");
  }

  // Persist buyer's Stripe checkout address to their profile (Settings → Postage) when we have it
  if (buyerId && addr?.line1?.trim() && (addr?.city?.trim() || addr?.postal_code?.trim() || addr?.country?.trim())) {
    const buyerAddressUpdates: Record<string, string | null> = {
      address_line1: addr.line1.trim(),
      address_line2: addr.line2?.trim() || null,
      address_city: addr.city?.trim() || null,
      address_postcode: addr.postal_code?.trim() || null,
      address_country: addr.country?.trim() || null,
      updated_at: new Date().toISOString(),
    };
    await admin
      .from("users")
      .update(buyerAddressUpdates)
      .eq("id", buyerId)
      .then(() => {})
      .catch((e) => console.error("Failed to update buyer profile address from Stripe", e));
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

  return { transactionId: txId };
}
