import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/stripe-checkout";

export const dynamic = "force-dynamic";

/** POST /api/checkout – same as create but no postcode/shipping. Prefer POST /api/checkout/create with buyerPostcode, shippingOption. */
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

  const { url } = await createCheckoutSession({
    listingId,
    listingPricePence: listing.price,
    sellerId: listing.user_id,
    sellerStripeAccountId: seller.stripe_account_id,
    buyerId: user.id,
    buyerEmail: user.email ?? undefined,
    origin,
    buyerPostcode: body.buyerPostcode ?? body.buyer_postcode,
    shippingOption: body.shippingOption ?? body.shipping_option ?? "tracked",
  });

  return NextResponse.json({ url });
}
