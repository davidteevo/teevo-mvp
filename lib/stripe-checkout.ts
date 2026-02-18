import Stripe from "stripe";
import { calcOrderBreakdown } from "@/lib/pricing";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });

export type CreateCheckoutParams = {
  listingId: string;
  listingPricePence: number;
  sellerId: string;
  sellerStripeAccountId: string;
  buyerId: string;
  buyerEmail: string | undefined;
  origin: string;
  /** Buyer postcode for shipping (optional, stored in metadata for labels) */
  buyerPostcode?: string;
  /** Shipping option id e.g. "tracked" (optional, stored in metadata) */
  shippingOption?: string;
};

/**
 * Creates a Stripe Checkout Session for a listing.
 * Uses destination charge: application_fee (authenticity + shipping) to platform, item to seller.
 * Returns the session URL for redirect.
 */
export async function createCheckoutSession(params: CreateCheckoutParams): Promise<{ url: string | null }> {
  const {
    listingId,
    listingPricePence,
    sellerId,
    sellerStripeAccountId,
    buyerId,
    buyerEmail,
    origin,
    buyerPostcode,
    shippingOption,
  } = params;

  const { itemPence, authenticityPence, shippingPence } = calcOrderBreakdown(listingPricePence);
  const applicationFeeAmount = authenticityPence + shippingPence;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_intent_data: {
      transfer_data: { destination: sellerStripeAccountId },
      application_fee_amount: applicationFeeAmount,
    },
    shipping_address_collection: { allowed_countries: ["GB"] },
    line_items: [
      {
        price_data: {
          currency: "gbp",
          unit_amount: itemPence,
          product_data: { name: "Item", images: [] },
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: "gbp",
          unit_amount: authenticityPence,
          product_data: { name: "Authenticity & Protection (8% + £0.50)", images: [] },
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: "gbp",
          unit_amount: shippingPence,
          product_data: { name: "Shipping (Tracked)", images: [] },
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/listing/${listingId}`,
    customer_email: buyerEmail ?? undefined,
    metadata: {
      listingId,
      buyerId,
      sellerId,
      ...(buyerPostcode != null && buyerPostcode !== "" && { buyerPostcode: String(buyerPostcode).slice(0, 32) }),
      ...(shippingOption != null && shippingOption !== "" && { shippingOption: String(shippingOption).slice(0, 32) }),
    },
  });

  return { url: session.url };
}
