import { Suspense } from "react";
import { ListingCard } from "./ListingCard";
import { getVerifiedListings } from "@/lib/listings";

async function GridInner({
  searchParams,
}: {
  searchParams: { category?: string; brand?: string; minPrice?: string; maxPrice?: string };
}) {
  let listings: Awaited<ReturnType<typeof getVerifiedListings>>;
  try {
    listings = await getVerifiedListings(searchParams);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[ListingGrid] getVerifiedListings failed:", message, e instanceof Error ? e.stack : "");
    return (
      <div className="rounded-xl border border-par-3-punch/20 bg-white/60 p-8 text-center text-mowing-green">
        <p className="font-medium">Unable to load listings.</p>
        <p className="mt-2 text-sm text-mowing-green/80">
          Check server logs for details. You can also try <a href="/api/health" className="underline">/api/health</a> to debug.
        </p>
      </div>
    );
  }
  if (!listings.length) {
    return (
      <div className="rounded-xl border border-par-3-punch/20 bg-white/60 p-12 text-center text-mowing-green/80">
        <p>No verified listings yet. Check back soon or list your first item.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-par-3-punch/20 bg-white/60 aspect-[3/4] animate-pulse"
            />
          ))}
        </div>
      }
    >
      <GridInner searchParams={searchParams} />
    </Suspense>
  );
}
