import { Suspense } from "react";
import { ListingCard } from "./ListingCard";
import { getVerifiedListings } from "@/lib/listings";
import type { Filters } from "@/lib/listings";

const PRIORITY_CARD_COUNT = 8;
const SKELETON_CARD_COUNT = 8;

async function GridInner({ searchParams }: { searchParams: Filters }) {
  const showDebug = (searchParams as Record<string, unknown>).listing_debug === "1";
  let listings: Awaited<ReturnType<typeof getVerifiedListings>>;
  try {
    listings = await getVerifiedListings(searchParams);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[ListingGrid] getVerifiedListings failed:", message, e instanceof Error ? e.stack : "");
    // #region agent log
    try {
      fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "7a6302" },
        body: JSON.stringify({
          sessionId: "7a6302",
          location: "components/listing/ListingGrid.tsx:catch",
          message: "getVerifiedListings threw",
          data: { errorMessage: message },
          hypothesisId: "L1",
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    } catch (_) {}
    // #endregion
    return (
      <div className="rounded-xl border border-par-3-punch/20 bg-white/60 p-8 text-center text-mowing-green">
        <p className="font-medium">Unable to load listings.</p>
        {showDebug && <p className="mt-2 text-xs font-mono text-left break-all bg-black/10 p-2 rounded">{message}</p>}
        <p className="mt-2 text-sm text-mowing-green/80">
          Check server logs for details. You can also try <a href="/api/health" className="underline">/api/health</a> to debug.
        </p>
      </div>
    );
  }
  if (!listings.length) {
    return (
      <div className="rounded-xl border border-par-3-punch/20 bg-white/60 p-12 text-center text-mowing-green/80 animate-fade-in">
        <p className="font-medium">No listings match your filters.</p>
        {showDebug && <p className="mt-2 text-xs font-mono">Debug: 0 listings returned (no error).</p>}
        <p className="mt-2 text-sm">Try clearing filters or broadening your search.</p>
      </div>
    );
  }
  const count = listings.length;
  const atLimit = count >= 60;
  return (
    <div className="animate-fade-in">
      <p className="text-sm text-mowing-green/70 mb-3">
        {atLimit ? "Showing up to 60 listings" : `${count} listing${count === 1 ? "" : "s"}`}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {listings.map((listing, index) => (
          <ListingCard key={listing.id} listing={listing} priority={index < PRIORITY_CARD_COUNT} />
        ))}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border border-par-3-punch/20 bg-white/60 overflow-hidden">
      <div className="aspect-[3/4] bg-mowing-green/10 animate-pulse" />
      <div className="p-2.5 sm:p-3 space-y-2">
        <div className="h-3 w-3/4 bg-mowing-green/20 rounded animate-pulse" />
        <div className="h-4 w-full bg-mowing-green/20 rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-mowing-green/20 rounded animate-pulse" />
        <div className="h-5 w-16 bg-mowing-green/20 rounded animate-pulse mt-2" />
      </div>
    </div>
  );
}

export function ListingGrid({ searchParams }: { searchParams: Filters }) {
  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: SKELETON_CARD_COUNT }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      }
    >
      <GridInner searchParams={searchParams} />
    </Suspense>
  );
}
