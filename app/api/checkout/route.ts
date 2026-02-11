import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });

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
  if (!listingId) {
    return NextResponse.json({ error: "listingId required" }, { status: 400 });
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: listing, error: listErr } = await admin
    .from("listings")
    .select("id, user_id, price, status")
    .eq("id", listingId)
    .single();

  if (listErr || !listing || listing.status !== "verified") {
    return NextResponse.json({ error: "Listing not found or not available" }, { status: 404 });
  }

  const { data: seller } = await admin.from("users").select("stripe_account_id").eq("id", listing.user_id).single();
  if (!seller?.stripe_account_id) {
    return NextResponse.json({ error: "Seller has not set up payouts" }, { status: 400 });
  }

  const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_intent_data: {
      transfer_data: { destination: seller.stripe_account_id },
    },
    line_items: [
      {
        price_data: {
          currency: "gbp",
          unit_amount: listing.price,
          product_data: {
            name: `Teevo listing ${listingId}`,
            images: [],
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/listing/${listingId}`,
    customer_email: user.email ?? undefined,
    metadata: { listingId, buyerId: user.id, sellerId: listing.user_id },
  });

  return NextResponse.json({ url: session.url });
}
