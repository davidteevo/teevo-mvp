import Stripe from "stripe";
import { calcOrderBreakdown } from "@/lib/pricing";
import { formatBuyerFeePercentage, getBuyerFeeSettings } from "@/lib/fees/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { BuyingDisabledError, isBuyingEnabled } from "@/lib/buying";
import { computeCheckoutIncentives } from "@/lib/referral/checkout-incentives";
import { resolveCheckoutIncentivesForBuyer } from "@/lib/referral/rewards";
import { assertStripeModeMatchesEnv } from "@/lib/stripe-env";

assertStripeModeMatchesEnv();
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
  /** Accepted offer id when checkout is from an accepted offer (for analytics) */
  acceptedOfferId?: string;
  /** Apply available Teevo credit (default true) */
  applyCredit?: boolean;
};

/**
 * Creates a Stripe Checkout Session for a listing.
 * Uses destination charge: application_fee (authenticity + shipping) to platform, item to seller.
 * Returns the session URL for redirect.
 */
export async function createCheckoutSession(params: CreateCheckoutParams): Promise<{ url: string | null }> {
  const admin = createAdminClient();
  if (!(await isBuyingEnabled(admin))) {
    throw new BuyingDisabledError();
  }

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
    acceptedOfferId,
    applyCredit = true,
  } = params;

  const fees = await getBuyerFeeSettings(admin);
  const { itemPence, authenticityPence, shippingPence } = calcOrderBreakdown(listingPricePence, fees);
  const eligibility = await resolveCheckoutIncentivesForBuyer(admin, {
    buyerId,
    itemPence,
    authenticityPence,
    shippingPence,
    applyCredit,
  });
  const incentives = computeCheckoutIncentives({
    itemPence,
    authenticityPence,
    shippingPence,
    referralDiscountPence: eligibility.referralDiscountPence,
    availableCreditPence: eligibility.availableCreditPence,
    applyCredit: eligibility.applyCredit,
  });
  const applicationFeeAmount = incentives.applicationFeePence;
  const baseOrigin = origin.replace(/\/$/, "");
  const termsUrl = `${baseOrigin}/terms`;

  let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
  if (incentives.totalIncentivePence > 0) {
    const coupon = await stripe.coupons.create({
      amount_off: incentives.totalIncentivePence,
      currency: "gbp",
      duration: "once",
      max_redemptions: 1,
      name:
        incentives.referralDiscountAppliedPence > 0 && incentives.creditRedeemedPence > 0
          ? "Teevo credit"
          : incentives.referralDiscountAppliedPence > 0
            ? "Referral credit"
            : "Teevo credit",
    });
    discounts = [{ coupon: coupon.id }];
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    custom_text: {
      submit: {
        message: `By completing this purchase, you agree to our [Terms & Conditions](${termsUrl}).`,
      },
    },
    payment_intent_data: {
      transfer_data: { destination: sellerStripeAccountId },
      application_fee_amount: applicationFeeAmount,
    },
    ...(discounts ? { discounts } : {}),
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
          product_data: { name: "Authenticity & Protection", images: [] },
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
      itemPence: String(itemPence),
      buyerFeePercentage: formatBuyerFeePercentage(fees.percentage),
      buyerFeeFixedPence: String(fees.fixedPence),
      buyerFeeAmountPence: String(authenticityPence),
      referralDiscountPence: String(incentives.referralDiscountAppliedPence),
      creditRedeemedPence: String(incentives.creditRedeemedPence),
      ...(buyerPostcode != null && buyerPostcode !== "" && { buyerPostcode: String(buyerPostcode).slice(0, 32) }),
      ...(shippingOption != null && shippingOption !== "" && { shippingOption: String(shippingOption).slice(0, 32) }),
      ...(acceptedOfferId != null && acceptedOfferId !== "" && { offerId: String(acceptedOfferId).slice(0, 36) }),
    },
  });

  return { url: session.url };
}
