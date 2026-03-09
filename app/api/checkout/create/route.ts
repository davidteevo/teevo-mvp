import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/stripe-checkout";
import { ShippingService, type ShippingServiceType } from "@/lib/shippo";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });

export const dynamic = "force-dynamic";

/**
 * POST /api/checkout/create
 * Body: { listingId, buyerPostcode?, shippingOption? }
 * Returns: { url } (Stripe Checkout Session URL) or { client_secret } if using PaymentIntent (we use Session).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const listingId = body.listingId;
  const acceptedOfferId = body.acceptedOfferId ?? body.accepted_offer_id;
  if (!listingId) {
    return NextResponse.json({ error: "listingId required" }, { status: 400 });
  }
  const buyerPostcode = body.buyerPostcode ?? body.buyer_postcode;
  const rawShipping = body.shippingOption ?? body.shipping_option ?? body.shipping_service ?? body.shippingService;
  const validServices: ShippingServiceType[] = [ShippingService.DPD_NEXT_DAY, ShippingService.DPD_SHIP_TO_SHOP];
  const shippingOption =
    typeof rawShipping === "string" && validServices.includes(rawShipping as ShippingServiceType)
      ? (rawShipping as ShippingServiceType)
      : ShippingService.DPD_NEXT_DAY;

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let listingPricePence: number;
  const { data: listing, error: listErr } = await admin
    .from("listings")
    .select("id, user_id, price, status")
    .eq("id", listingId)
    .is("archived_at", null)
    .single();

  if (listErr || !listing || listing.status !== "verified") {
    return NextResponse.json({ error: "Listing not found or not available" }, { status: 404 });
  }

  if (acceptedOfferId) {
    const { data: offer } = await admin
      .from("offers")
      .select("id, listing_id, buyer_id, amount_pence, status")
      .eq("id", acceptedOfferId)
      .single();
    if (!offer || offer.buyer_id !== user.id || offer.status !== "accepted" || offer.listing_id !== listingId) {
      return NextResponse.json({ error: "Invalid or expired offer" }, { status: 400 });
    }
    listingPricePence = offer.amount_pence;
  } else {
    listingPricePence = listing.price;
  }

  const { data: seller } = await admin.from("users").select("stripe_account_id").eq("id", listing.user_id).single();
  if (!seller?.stripe_account_id) {
    return NextResponse.json({ error: "Seller has not set up payouts" }, { status: 400 });
  }
  try {
    const account = await stripe.accounts.retrieve(seller.stripe_account_id);
    if (!account.payouts_enabled) {
      return NextResponse.json({ error: "Seller has not completed payouts setup" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Seller payouts not available" }, { status: 400 });
  }

  const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const { url } = await createCheckoutSession({
    listingId,
    listingPricePence,
    sellerId: listing.user_id,
    sellerStripeAccountId: seller.stripe_account_id,
    buyerId: user.id,
    buyerEmail: user.email ?? undefined,
    origin,
    buyerPostcode: typeof buyerPostcode === "string" ? buyerPostcode : undefined,
    shippingOption: typeof shippingOption === "string" ? shippingOption : undefined,
    ...(acceptedOfferId && { acceptedOfferId: String(acceptedOfferId) }),
  });

  if (!url) {
    return NextResponse.json({ error: "Checkout session URL not available" }, { status: 500 });
  }
  return NextResponse.json({ url });
}
