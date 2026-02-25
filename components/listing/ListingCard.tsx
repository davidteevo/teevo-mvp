import Link from "next/link";
import Image from "next/image";
import type { Listing } from "@/types/database";
import { VerifiedBadge } from "@/components/trust/VerifiedBadge";
import { formatPrice } from "@/lib/format";

/** Listing optionally with joined seller display name (from users relation). Supabase returns users as array for the join. */
type ListingWithSeller = Listing & {
  users?: { display_name?: string | null }[] | { display_name?: string | null } | null;
};

function firstImage(listing: Listing): string | null {
  const images = listing.listing_images;
  if (!images?.length) return null;
  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);
  return sorted[0]?.storage_path ?? null;
}

function sellerDisplayName(listing: ListingWithSeller): string | null {
  const u = listing.users;
  if (!u) return null;
  const first = Array.isArray(u) ? u[0] : u;
  const name = first && typeof first === "object" && "display_name" in first ? first.display_name : null;
  return name?.trim() || null;
}

export function ListingCard({ listing, priority }: { listing: ListingWithSeller; priority?: boolean }) {
  const imgPath = firstImage(listing);
  const sellerName = sellerDisplayName(listing);
  const imageUrl = imgPath
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listings/${imgPath}`
    : "/placeholder-listing.svg";

  return (
    <Link
      href={`/listing/${listing.id}`}
      className="block rounded-lg border border-par-3-punch/20 bg-white overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-[3/4] relative bg-mowing-green/5">
        <Image
          src={imageUrl}
          alt={listing.model}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          priority={priority}
        />
        <div className="absolute top-1.5 right-1.5">
          <VerifiedBadge />
        </div>
      </div>
      <div className="p-2.5 sm:p-3">
        <p className="text-[10px] sm:text-xs text-mowing-green/70 uppercase tracking-wide truncate">
          {listing.category} · {listing.brand}
        </p>
        <h2 className="text-sm font-semibold text-mowing-green mt-0.5 line-clamp-2">
          {listing.model}
        </h2>
        <p className="text-[10px] sm:text-xs text-mowing-green/70 mt-0.5 truncate">{listing.condition}</p>
        {sellerName && (
          <p className="text-[10px] sm:text-xs text-mowing-green/60 mt-0.5 truncate">Sold by {sellerName}</p>
        )}
        <p className="mt-1.5 text-base font-bold text-mowing-green">
          {formatPrice(listing.price)}
        </p>
      </div>
    </Link>
  );
}
