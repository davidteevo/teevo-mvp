import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createTransactionAndSendEmails } from "@/lib/checkout-complete";
import {
  notifyPaymentIssue,
  notifyPayoutFailed,
  notifySellerPayoutAccountIssue,
  resolvePaymentAndRefundNotifications,
} from "@/lib/notification-events";
import { NotificationType, resolveNotifications } from "@/lib/notifications";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

function getPaymentIntentId(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value;
  if (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof (value as { id: unknown }).id === "string"
  ) {
    return (value as { id: string }).id;
  }
  return undefined;
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function findTxByPaymentIntent(
  admin: ReturnType<typeof adminClient>,
  paymentIntentId: string | undefined
) {
  if (!paymentIntentId) return null;
  const { data } = await admin
    .from("transactions")
    .select("id, listing_id, seller_id, status, cancellation_status, stripe_refund_id, cancellation_reason")
    .eq("stripe_payment_id", paymentIntentId)
    .maybeSingle();
  return data;
}

async function findOpenTxForSeller(
  admin: ReturnType<typeof adminClient>,
  sellerId: string
) {
  const { data } = await admin
    .from("transactions")
    .select("id, listing_id, status")
    .eq("seller_id", sellerId)
    .in("status", ["pending", "shipped", "dispute"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
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
  } catch {
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
  }

  const admin = adminClient();

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
      const tx = await findTxByPaymentIntent(admin, paymentIntentId);
      if (tx) {
        await notifyPaymentIssue(admin, {
          transactionId: tx.id,
          listingId: tx.listing_id,
          kind: "dispute",
        });
      }
    }
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId = getPaymentIntentId(charge.payment_intent);
    if (paymentIntentId) {
      const tx = await findTxByPaymentIntent(admin, paymentIntentId);
      const refundId =
        typeof charge.refunds?.data?.[0]?.id === "string" ? charge.refunds.data[0].id : null;
      if (tx?.cancellation_status === "completed") {
        if (refundId && !tx.stripe_refund_id) {
          await admin
            .from("transactions")
            .update({ stripe_refund_id: refundId, updated_at: new Date().toISOString() })
            .eq("id", tx.id)
            .is("stripe_refund_id", null);
        }
        await resolvePaymentAndRefundNotifications(admin, tx.id);
      } else if (tx) {
        await admin
          .from("transactions")
          .update({
            status: "refunded",
            ...(refundId ? { stripe_refund_id: refundId } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("id", tx.id);
        await resolvePaymentAndRefundNotifications(admin, tx.id);
      } else {
        await admin
          .from("transactions")
          .update({
            status: "refunded",
            ...(refundId ? { stripe_refund_id: refundId } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_payment_id", paymentIntentId);
      }
    }
  }

  if (event.type === "refund.updated") {
    const refund = event.data.object as Stripe.Refund;
    const chargeId = refund.charge;
    if (chargeId) {
      const charge = await stripe.charges.retrieve(chargeId as string);
      const paymentIntentId = getPaymentIntentId(charge.payment_intent);
      const tx = await findTxByPaymentIntent(admin, paymentIntentId);
      if (refund.status === "succeeded") {
        if (tx?.cancellation_status === "completed") {
          if (refund.id && !tx.stripe_refund_id) {
            await admin
              .from("transactions")
              .update({ stripe_refund_id: refund.id, updated_at: new Date().toISOString() })
              .eq("id", tx.id)
              .is("stripe_refund_id", null);
          }
          await resolvePaymentAndRefundNotifications(admin, tx.id);
        } else if (tx) {
          await admin
            .from("transactions")
            .update({
              status: "refunded",
              stripe_refund_id: refund.id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", tx.id);
          await resolvePaymentAndRefundNotifications(admin, tx.id);
        } else if (paymentIntentId) {
          await admin
            .from("transactions")
            .update({
              status: "refunded",
              stripe_refund_id: refund.id,
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_payment_id", paymentIntentId);
        }
      } else if (refund.status === "failed" && tx) {
        await notifyPaymentIssue(admin, {
          transactionId: tx.id,
          listingId: tx.listing_id,
          kind: "refund_failed",
        });
      }
    }
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    const payoutsEnabled = account.payouts_enabled === true;
    const blocking =
      !payoutsEnabled ||
      !!account.requirements?.disabled_reason ||
      (account.requirements?.currently_due?.length ?? 0) > 0;
    if (blocking) {
      const { data: seller } = await admin
        .from("users")
        .select("id")
        .eq("stripe_account_id", account.id)
        .maybeSingle();
      if (seller?.id) {
        const tx = await findOpenTxForSeller(admin, seller.id);
        if (tx) {
          await notifySellerPayoutAccountIssue(admin, {
            transactionId: tx.id,
            listingId: tx.listing_id,
          });
        }
      }
    } else if (payoutsEnabled) {
      const { data: seller } = await admin
        .from("users")
        .select("id")
        .eq("stripe_account_id", account.id)
        .maybeSingle();
      if (seller?.id) {
        const { data: txs } = await admin
          .from("transactions")
          .select("id")
          .eq("seller_id", seller.id);
        for (const tx of txs ?? []) {
          await resolveNotifications(admin, {
            types: [
              NotificationType.SELLER_PAYOUT_ACCOUNT_ISSUE,
              NotificationType.FUNDS_RELEASE_REQUIRES_ACTION,
            ],
            entityId: tx.id,
          });
        }
      }
    }
  }

  const eventType = event.type as string;
  if (eventType === "transfer.failed" || eventType === "payout.failed") {
    const obj = event.data.object as { destination?: string | null; amount?: number };
    const destinationId =
      typeof obj.destination === "string"
        ? obj.destination
        : event.type === "payout.failed"
          ? ((event.data.object as Stripe.Payout) as { destination?: string }).destination
          : undefined;
    const accountId =
      typeof event.account === "string"
        ? event.account
        : typeof destinationId === "string" && destinationId.startsWith("acct_")
          ? destinationId
          : null;

    let sellerId: string | null = null;
    if (accountId) {
      const { data: seller } = await admin
        .from("users")
        .select("id")
        .eq("stripe_account_id", accountId)
        .maybeSingle();
      sellerId = seller?.id ?? null;
    }

    if (sellerId) {
      const tx = await findOpenTxForSeller(admin, sellerId);
      if (tx) {
        await notifyPayoutFailed(admin, {
          transactionId: tx.id,
          listingId: tx.listing_id,
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
