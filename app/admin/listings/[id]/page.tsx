import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { formatPrice } from "@/lib/format";
import { getListingDisplayTitle } from "@/lib/listing-display";
import { getListingImageUrl } from "@/lib/listing-images";
import type { Listing } from "@/types/database";
import { ClubDetailsTable } from "@/components/listing/ClubDetailsDisplay";
import { AdminListingActions } from "./AdminListingActions";
import { AdminListingFeedback } from "./AdminListingFeedback";
import { ReducePriceControl } from "@/components/listing/ReducePriceControl";
import { getListingWatchCount } from "@/lib/watchlist";
import { listingHasOpenPaidOrder } from "@/lib/listing-availability-admin";

export const dynamic = "force-dynamic";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function imageUrl(path: string, variant: "main" | "thumb" = "main") {
  return getListingImageUrl(path, variant, process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export default async function AdminListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [{ data: listing, error }, watchCount] = await Promise.all([
    admin
      .from("listings")
      .select(`
      id, user_id, category, brand, model, title, condition, price, description, shaft, degree, shaft_flex, lie_angle, club_length, shaft_weight, shaft_material, grip_brand, grip_model, grip_size, grip_condition, handed, listing_format, standard_spec_status, iron_number, set_composition, bounce, grind, head_number, headcover_included, item_type, size, colour, status, created_at, admin_feedback, created_on_behalf, created_by_admin_id, buying_paused, availability_confirmation_status, availability_confirmation_source, availability_confirmation_requested_at, availability_confirmed_at, availability_confirmation_batch_id,
      listing_images(storage_path, sort_order),
      listing_clubs(id, listing_id, sort_order, club_type, iron_number, degree, bounce, grind, shaft, shaft_flex, created_at),
      users!user_id(id, email, role, created_at)
    `)
      .eq("id", id)
      .single(),
    getListingWatchCount(admin, id),
  ]);

  if (error || !listing) notFound();

  let sellerData: { id: string; email: string; role: string; created_at: string } | null = null;
  const usersRel = (listing as { users?: unknown }).users;
  if (usersRel) {
    const one = Array.isArray(usersRel) ? usersRel[0] : usersRel;
    if (one && typeof one === "object" && "email" in one) sellerData = one as typeof sellerData;
  }
  if (!sellerData && listing.user_id) {
    const { data: userRow } = await admin.from("users").select("id, email, role, created_at").eq("id", listing.user_id).single();
    if (userRow) sellerData = userRow;
  }

  const images = (listing.listing_images ?? []).sort(
    (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
  );
  const imageUrls = images.map((img: { storage_path: string }) => imageUrl(img.storage_path, "main"));
  const displayTitle = getListingDisplayTitle(listing as unknown as Listing);
  const listingRow = listing as {
    buying_paused?: boolean;
    availability_confirmation_status?: string | null;
    availability_confirmation_source?: string | null;
    availability_confirmation_requested_at?: string | null;
    availability_confirmed_at?: string | null;
    availability_confirmation_batch_id?: string | null;
  };
  const [hasOpenOrder, batch] = await Promise.all([
    listingHasOpenPaidOrder(admin, listing.id, listing.status),
    listingRow.availability_confirmation_batch_id
      ? admin
          .from("listing_availability_batches")
          .select("email_error")
          .eq("id", listingRow.availability_confirmation_batch_id)
          .maybeSingle()
          .then(({ data }) => data)
      : Promise.resolve(null),
  ]);
  const structuredMeta = [
    (listing as { item_type?: string | null }).item_type?.trim(),
    (listing as { size?: string | null }).size?.trim(),
    (listing as { colour?: string | null }).colour?.trim(),
  ].filter(Boolean) as string[];

  return (
    <div className="max-w-5xl mx-auto">
      <Link
        href="/admin/listings"
        className="inline-flex items-center text-mowing-green/80 hover:text-mowing-green text-sm font-medium mb-6"
      >
        ← Back to pending listings
      </Link>

      <div className="rounded-xl border border-par-3-punch/20 bg-white overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 lg:p-8">
          {/* Large photos for inspection */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-mowing-green/70 uppercase tracking-wide">
              Photos ({imageUrls.length})
            </h2>
            <div className="aspect-square relative rounded-xl overflow-hidden bg-mowing-green/5">
              {imageUrls[0] ? (
                <img
                  src={imageUrls[0]}
                  alt={displayTitle}
                  className="w-full h-full object-contain bg-white"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-mowing-green/50">
                  No image
                </div>
              )}
            </div>
            {imageUrls.length > 1 && (
              <div className="grid grid-cols-3 gap-3">
                {imageUrls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-square block rounded-lg overflow-hidden border border-par-3-punch/20 bg-mowing-green/5 hover:ring-2 hover:ring-mowing-green/30 transition-shadow"
                  >
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            )}
            <p className="text-xs text-mowing-green/60">
              Click thumbnails to open full size in a new tab.
            </p>
          </div>

          <div>
            {(listing as { created_on_behalf?: boolean }).created_on_behalf && sellerData && (
              <p className="text-sm text-mowing-green/60 mb-2">
                Created by admin on behalf of {sellerData.email}
              </p>
            )}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-mowing-green/70 uppercase tracking-wide">
                  {listing.category} · {listing.brand}
                </p>
                <h1 className="text-2xl font-bold text-mowing-green mt-1">
                  {displayTitle}
                </h1>
                <p className="text-mowing-green/80 mt-1">
                  {listing.condition}
                  {listing.handed && ` · ${listing.handed === "left" ? "Left" : "Right"} handed`}
                </p>
                {structuredMeta.length > 0 && (
                  <p className="mt-1 text-sm text-mowing-green/80">
                    {structuredMeta.join(" · ")}
                  </p>
                )}
                <ClubDetailsTable listing={listing as unknown as Listing} />
                <p className="mt-3 text-xl font-bold text-mowing-green">
                  {formatPrice(listing.price)}
                </p>
                {listing.status === "verified" && (
                  <div className="mt-2">
                    <ReducePriceControl listingId={listing.id} currentPricePence={listing.price} refreshOnSuccess />
                  </div>
                )}
                <p className="mt-2 text-sm text-mowing-green/60">
                  Status: <span className="font-medium">{listing.status}</span>
                  {listing.created_at && (
                    <> · Listed {new Date(listing.created_at).toLocaleDateString("en-GB")}</>
                  )}
                  <> · Watchers: {watchCount}</>
                </p>
              </div>
              <AdminListingActions
                listingId={listing.id}
                status={listing.status}
                buyingPaused={listingRow.buying_paused === true}
                availabilityStatus={listingRow.availability_confirmation_status}
                availabilitySource={listingRow.availability_confirmation_source}
                availabilityRequestedAt={listingRow.availability_confirmation_requested_at}
                availabilityConfirmedAt={listingRow.availability_confirmed_at}
                batchId={listingRow.availability_confirmation_batch_id}
                emailError={batch?.email_error ?? null}
                hasOpenOrder={hasOpenOrder}
              />
            </div>

            {sellerData && (
              <div className="mt-6 pt-6 border-t border-par-3-punch/20">
                <h2 className="text-sm font-semibold text-mowing-green/70 uppercase tracking-wide mb-2">
                  Seller
                </h2>
                <div className="rounded-lg bg-mowing-green/5 border border-par-3-punch/10 p-3 text-sm text-mowing-green/90">
                  <p><span className="font-medium text-mowing-green/80">Email</span>{" "}<a href={`mailto:${sellerData.email}`} className="text-par-3-punch hover:underline">{sellerData.email}</a></p>
                  <p className="mt-1"><span className="font-medium text-mowing-green/80">Role</span>{" "}{sellerData.role}</p>
                  {sellerData.created_at && (
                    <p className="mt-1"><span className="font-medium text-mowing-green/80">Joined</span>{" "}{new Date(sellerData.created_at).toLocaleDateString("en-GB")}</p>
                  )}
                  <p className="mt-1 text-mowing-green/60 font-mono text-xs">ID: {sellerData.id}</p>
                </div>
                <Link
                  href="/admin/users"
                  className="mt-2 inline-block text-sm text-par-3-punch hover:underline"
                >
                  View all users →
                </Link>
              </div>
            )}

            {listing.description && (
              <div className="mt-6 pt-6 border-t border-par-3-punch/20">
                <h2 className="text-sm font-semibold text-mowing-green/70 uppercase tracking-wide mb-2">
                  Description
                </h2>
                <p className="text-mowing-green/90 whitespace-pre-wrap">{listing.description}</p>
              </div>
            )}

            <AdminListingFeedback
              listingId={listing.id}
              initialFeedback={listing.admin_feedback ?? null}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
