import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getListingById } from "@/lib/listings";
import { VerifiedBadge } from "@/components/trust/VerifiedBadge";
import { BuyButton } from "./BuyButton";

function formatPrice(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let listing;
  try {
    listing = await getListingById(id);
  } catch {
    notFound();
  }

  if (listing.status !== "verified") {
    notFound();
  }

  const images = (listing.listing_images ?? []).sort(
    (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
  );
  const imagePaths = images.map(
    (img: { storage_path: string }) =>
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listings/${img.storage_path}`
  );
  const firstImageUrl = imagePaths[0] ?? "/placeholder-listing.svg";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="aspect-square relative rounded-xl overflow-hidden bg-mowing-green/5">
            <Image
              src={firstImageUrl}
              alt={listing.model}
              fill
              className="object-cover"
              priority
              unoptimized={imagePaths.length > 0}
            />
            <div className="absolute top-3 left-3">
              <VerifiedBadge />
            </div>
          </div>
          {imagePaths.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {imagePaths.slice(0, 4).map((url: string, i: number) => (
                <div
                  key={i}
                  className="aspect-square relative rounded-lg overflow-hidden bg-mowing-green/5"
                >
                  <Image
                    src={url}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          )}
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
            {formatPrice(listing.price)}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="inline-flex items-center rounded-full bg-par-3-punch/20 text-mowing-green px-3 py-1 text-xs font-medium">
              Secure payment protected
            </span>
            <span className="inline-flex items-center rounded-full bg-par-3-punch/20 text-mowing-green px-3 py-1 text-xs font-medium">
              UK only
            </span>
          </div>

          {listing.description && (
            <div className="mt-6 prose prose-sm text-mowing-green/90 max-w-none">
              <h2 className="text-lg font-semibold text-mowing-green">
                Description
              </h2>
              <p className="whitespace-pre-wrap">{listing.description}</p>
            </div>
          )}

          <div className="mt-8">
            <BuyButton listingId={listing.id} price={listing.price} />
          </div>
        </div>
      </div>
    </div>
  );
}
