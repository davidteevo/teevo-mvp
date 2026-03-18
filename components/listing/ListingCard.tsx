import Link from "next/link";
import Image from "next/image";
import type { Listing } from "@/types/database";
import { VerifiedBadge } from "@/components/trust/VerifiedBadge";
import { PriceWithBreakdown } from "@/components/listing/PriceWithBreakdown";
import { getListingDisplayTitle, getListingMetaParts } from "@/lib/listing-display";
import { getListingImageUrl } from "@/lib/listing-images";

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
  const imageUrl = imgPath ? getListingImageUrl(imgPath, "thumb") : "/placeholder-listing.svg";

  const displayTitle = getListingDisplayTitle(listing);
  const metaParts = getListingMetaParts(listing);
  const specParts = [
    listing.shaft?.trim(),
    listing.shaft_flex?.trim(),
    listing.degree?.trim() ? `${listing.degree}${String(listing.degree).trim().endsWith("°") ? "" : "°"}` : null,
      listing.lie_angle?.trim()
        ? (() => {
            const lie = String(listing.lie_angle).trim();
            const needsDegree = !lie.endsWith("°") && /[0-9]$/.test(lie);
            return needsDegree ? `${lie}°` : lie;
          })()
        : null,
    listing.club_length?.trim() || null,
    listing.shaft_material?.trim() || null,
    listing.shaft_weight?.trim() || null,
    listing.handed ? (listing.handed === "left" ? "Left" : "Right") + " handed" : null,
    listing.grip_size?.trim()
      ? listing.grip_condition?.trim()
        ? `${listing.grip_size} (${listing.grip_condition})`
        : listing.grip_size
      : null,
  ].filter(Boolean) as string[];
  const specLine = specParts.length > 0 ? specParts.join(" · ") : null;

  return (
    <Link
      href={`/listing/${listing.id}`}
      className="block min-w-0 max-w-full rounded-lg border border-par-3-punch/20 bg-white overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
    >
      <div className="aspect-[3/4] relative bg-mowing-green/5">
        <Image
          src={imageUrl}
          alt={displayTitle}
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
          {displayTitle}
        </h2>
        <p className="text-[10px] sm:text-xs text-mowing-green/70 mt-0.5 truncate">{metaParts.join(" · ")}</p>
        {specLine && (
          <p className="text-[10px] sm:text-xs text-mowing-green/60 mt-0.5 truncate">{specLine}</p>
        )}
        {sellerName && (
          <p className="text-[10px] sm:text-xs text-mowing-green/60 mt-0.5 truncate">Sold by {sellerName}</p>
        )}
        <PriceWithBreakdown
          pricePence={listing.price}
          displayTitle={displayTitle}
          imageUrl={imageUrl}
        />
      </div>
    </Link>
  );
}
