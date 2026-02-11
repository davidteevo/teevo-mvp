import { Suspense } from "react";
import { ListingCard } from "./ListingCard";
import { getVerifiedListings } from "@/lib/listings";

async function GridInner({
  searchParams,
}: {
  searchParams: { category?: string; brand?: string; minPrice?: string; maxPrice?: string };
}) {
  const listings = await getVerifiedListings(searchParams);
  if (!listings.length) {
    return (
      <div className="rounded-xl border border-par-3-punch/20 bg-white/60 p-12 text-center text-mowing-green/80">
        <p>No verified listings yet. Check back soon or list your first item.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}

export function ListingGrid({
  searchParams,
}: {
  searchParams: { category?: string; brand?: string; minPrice?: string; maxPrice?: string };
}) {
  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-par-3-punch/20 bg-white/60 aspect-[1] animate-pulse"
            />
          ))}
        </div>
      }
    >
      <GridInner searchParams={searchParams} />
    </Suspense>
  );
}
