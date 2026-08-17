import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { ShippingService, type ShippingServiceType } from "@/lib/shippo";
import {
  SHIPPING_FEE_GBP,
  FulfilmentStatus,
  getPlatformFulfilmentMode,
} from "@/lib/fulfilment";
import { ensureEmailSent, EmailTriggerType, formatGbp, getListingEmailContext } from "@/lib/email-triggers";
import { getAppUrl } from "@/lib/app-env";
import { notifyCheckoutComplete } from "@/lib/notification-events";
import { notifyWatchersSold } from "@/lib/watchlist-emails";
import { listingPurchaseApiError } from "@/lib/listing-availability";
import { getDispatchDeadlineDays } from "@/lib/dispatch-settings";
import { computeInitialDispatchDeadline } from "@/lib/dispatch-deadline";
import { formatDispatchDeadline } from "@/lib/business-days";
import { recordTransactionEvent, TransactionEventType } from "@/lib/transaction-events";
import { trackServerEvent } from "@/lib/starter-pack";
import { onCheckoutComplete } from "@/lib/referral/rewards";
import { referralEmailModuleHtml } from "@/lib/referral/notify";

const appUrl = getAppUrl();

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

  const { data: listingForPurchase } = await admin
    .from("listings")
    .select("status, archived_at, buying_paused, availability_confirmation_status")
    .eq("id", listingId)
    .single();
  const purchaseErr = listingPurchaseApiError(listingForPurchase);
  if (purchaseErr) {
    throw new Error(purchaseErr.error);
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

  const fulfilment_mode = await getPlatformFulfilmentMode(admin);
  const createdAt = new Date();
  const deadlineDays = await getDispatchDeadlineDays(admin);
  const { original, active } = computeInitialDispatchDeadline(createdAt, deadlineDays);
  const originalIso = original.toISOString();
  const deadlineIso = active.toISOString();
  const deadlineLabel = formatDispatchDeadline(active, createdAt);

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
      fulfilment_mode,
      buyer_postcode: addr?.postal_code ?? session.metadata?.buyerPostcode ?? null,
      shipping_option: session.metadata?.shippingOption ?? null,
      shipping_service,
      shipping_fee_gbp: SHIPPING_FEE_GBP,
      buyer_name: buyerName,
      buyer_address_line1: addr?.line1 ?? null,
      buyer_address_line2: addr?.line2 ?? null,
      buyer_city: addr?.city ?? null,
      buyer_country: addr?.country ?? null,
      original_dispatch_deadline_at: originalIso,
      dispatch_deadline_at: deadlineIso,
      referral_discount_pence: parseInt(session.metadata?.referralDiscountPence ?? "0", 10) || 0,
      credit_redeemed_pence: parseInt(session.metadata?.creditRedeemedPence ?? "0", 10) || 0,
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
    try {
      const { error } = await admin
        .from("users")
        .update(buyerAddressUpdates)
        .eq("id", buyerId);
      if (error) {
        console.error("Failed to update buyer profile address from Stripe", error);
      }
    } catch (e) {
      console.error("Failed to update buyer profile address from Stripe", e);
    }
  }

  await admin.from("listings").update({ status: "sold", updated_at: new Date().toISOString() }).eq("id", listingId);
  await notifyWatchersSold(admin, listingId, { skipUserId: buyerId }).catch((e) =>
    console.error("notifyWatchersSold failed", e)
  );

  const txId = newTx.id;
  await recordTransactionEvent(admin, {
    transactionId: txId,
    eventType: TransactionEventType.ORDER_CREATED,
    payload: { listing_id: listingId, buyer_id: buyerId, seller_id: sellerId },
  });
  await recordTransactionEvent(admin, {
    transactionId: txId,
    eventType: TransactionEventType.DISPATCH_DEADLINE_CREATED,
    payload: {
      original_dispatch_deadline_at: originalIso,
      dispatch_deadline_at: deadlineIso,
      days: deadlineDays,
    },
  });
  await trackServerEvent(admin, "dispatch_deadline_created", {
    userId: sellerId,
    properties: { transaction_id: txId, dispatch_deadline_at: deadlineIso, days: deadlineDays },
  });

  const totalGbp = formatGbp(amount);
  const shippingGbp = SHIPPING_FEE_GBP.toFixed(2);
  const { itemName, hero_image } = await getListingEmailContext(admin, listingId);
  const { data: buyer } = await admin.from("users").select("email").eq("id", buyerId).single();
  const { data: seller } = await admin.from("users").select("email").eq("id", sellerId).single();
  const buyerEmail = buyer?.email ?? null;
  const sellerEmail = seller?.email ?? null;

  const orderLink = `${appUrl}/dashboard/purchases?id=${encodeURIComponent(txId)}`;
  const salesLink = `${appUrl}/dashboard/sales?id=${encodeURIComponent(txId)}`;

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
        body: `Total: £${totalGbp}<br />Shipping: £${shippingGbp}`,
        order_number: txId.slice(0, 8),
        item_name: itemName,
        hero_image,
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
      subject: `Your ${itemName} has sold — ship by ${deadlineLabel}`,
      type: "transactional",
      variables: {
        title: "Item sold",
        subtitle: `Ship your order by ${deadlineLabel}.`,
        body: [
          `The buyer has paid.`,
          `Please pack the item securely and complete packaging so you can dispatch by ${deadlineLabel}.`,
          `If you don't dispatch the order by ${deadlineLabel}, the order may be automatically cancelled and the buyer refunded.`,
          await referralEmailModuleHtml(admin, sellerId),
        ].join("<br />"),
        order_number: txId.slice(0, 8),
        item_name: itemName,
        hero_image,
        cta_link: salesLink,
        cta_text: "View order",
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
        body: `Total: £${totalGbp}<br />Shipping: £${shippingGbp}`,
        order_number: txId.slice(0, 8),
        item_name: itemName,
        hero_image,
        cta_link: salesLink,
        cta_text: "View order",
      },
    }).catch((e) => console.error("Payment received email failed", e));
  }

  await notifyCheckoutComplete(admin, {
    transactionId: txId,
    listingId,
    buyerId,
    sellerId,
    dispatchDeadlineLabel: deadlineLabel,
  });

  const itemPence = parseInt(session.metadata?.itemPence ?? "0", 10) || 0;
  const referralDiscountPence = parseInt(session.metadata?.referralDiscountPence ?? "0", 10) || 0;
  const creditRedeemedPence = parseInt(session.metadata?.creditRedeemedPence ?? "0", 10) || 0;
  await onCheckoutComplete(admin, {
    transactionId: txId,
    buyerId,
    sellerId,
    listingId,
    itemPence,
    referralDiscountPence,
    creditRedeemedPence,
  }).catch((e) => console.error("onCheckoutComplete failed", e));

  return { transactionId: txId };
}
