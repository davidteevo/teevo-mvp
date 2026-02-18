import Stripe from "stripe";
import { notFound } from "next/navigation";
import { getListingById, getListingByIdAdmin } from "@/lib/listings";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calcOrderBreakdown, formatPence } from "@/lib/pricing";
import { BuyButton } from "./BuyButton";
import { ListingImageGallery } from "./ListingImageGallery";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let listing: Awaited<ReturnType<typeof getListingById>> | null = null;
  try {
    listing = await getListingById(id);
  } catch {
    // Listing not found or RLS denied (e.g. sold and user is buyer)
  }

  let isBuyerViewingSold = false;
  if (!listing || listing.status !== "verified") {
    // Allow buyer to view their purchased (sold) listing
    if (user?.id) {
      try {
        const admin = createAdminClient();
        const { data: tx } = await admin
          .from("transactions")
          .select("id")
          .eq("listing_id", id)
          .eq("buyer_id", user.id)
          .single();
        if (tx) {
          listing = await getListingByIdAdmin(id);
          isBuyerViewingSold = true;
        }
      } catch {
        // not buyer or listing missing
      }
    }
    // Allow seller to view own listing (any status); otherwise 404 if not verified/sold
    if (!listing) notFound();
    if (listing.status !== "verified" && listing.status !== "sold" && listing.user_id !== user?.id) {
      notFound();
    }
  }

  const isPurchasedView = isBuyerViewingSold;

  const images = (listing.listing_images ?? []).sort(
    (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
  );
  const imagePaths = images.map(
    (img: { storage_path: string }) =>
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listings/${img.storage_path}`
  );
  const imageUrls =
    imagePaths.length > 0 ? imagePaths : ["/placeholder-listing.svg"];
  const { itemPence, authenticityPence, shippingPence, totalPence } =
    calcOrderBreakdown(listing.price);

  let sellerCanAcceptPayment = false;
  if (!isPurchasedView) {
    const admin = createAdminClient();
    const { data: seller } = await admin
      .from("users")
      .select("stripe_account_id")
      .eq("id", listing.user_id)
      .single();
    if (seller?.stripe_account_id) {
      try {
        const account = await stripe.accounts.retrieve(seller.stripe_account_id);
        sellerCanAcceptPayment = account.payouts_enabled === true;
      } catch {
        // Account invalid or deleted
      }
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <ListingImageGallery imageUrls={imageUrls} alt={listing.model} />
        </div>

        <div>
          <p className="text-sm text-mowing-green/70 uppercase tracking-wide">
            {listing.category} · {listing.brand}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-mowing-green mt-1">
            {listing.model}
          </h1>
          <p className="text-mowing-green/80 mt-2">{listing.condition}</p>
          <p className="mt-4 text-3xl font-bold text-mowing-green">
            {formatPence(itemPence)}
          </p>
          <div className="mt-2 space-y-0.5 text-mowing-green/80 text-[15px]">
            <p>{formatPence(authenticityPence)} Authenticity &amp; Protection</p>
            <p>est. {formatPence(shippingPence)} shipping</p>
            <p className="text-mowing-green font-medium pt-1">
              Total estimated: {formatPence(totalPence)}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {isPurchasedView ? (
              <span className="inline-flex items-center rounded-full bg-mowing-green/20 text-mowing-green px-3 py-1 text-xs font-medium">
                You purchased this item
              </span>
            ) : (
              <>
                <span className="inline-flex items-center rounded-full bg-par-3-punch/20 text-mowing-green px-3 py-1 text-xs font-medium">
                  Secure payment protected
                </span>
                <span className="inline-flex items-center rounded-full bg-par-3-punch/20 text-mowing-green px-3 py-1 text-xs font-medium">
                  UK only
                </span>
              </>
            )}
          </div>

          {listing.description && (
            <div className="mt-6 prose prose-sm text-mowing-green/90 max-w-none">
              <h2 className="text-lg font-semibold text-mowing-green">
                Description
              </h2>
              <p className="whitespace-pre-wrap">{listing.description}</p>
            </div>
          )}

          {!isPurchasedView && (
            <div className="mt-8">
              <BuyButton
                listingId={listing.id}
                price={listing.price}
                totalPence={totalPence}
                sellerCanAcceptPayment={sellerCanAcceptPayment}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
