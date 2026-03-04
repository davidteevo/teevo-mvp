import { Suspense } from "react";
import { ListingGrid } from "@/components/listing/ListingGrid";
import { ListingFilters } from "@/components/listing/ListingFilters";
import { SmartSearchHero } from "@/components/listing/SmartSearchHero";
import { CategoryShortcuts } from "@/components/listing/CategoryShortcuts";

export type SearchParams = {
  category?: string;
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
  search?: string;
  shaft?: string;
  shaftFlex?: string;
  degree?: string;
  handed?: string;
};

function FiltersFallback() {
  return (
    <div className="flex flex-wrap items-end gap-3 mb-4 py-2 animate-pulse h-10" aria-hidden />
  );
}

const buyingEnabled = process.env.NEXT_PUBLIC_BUYING_ENABLED !== "false";

export default function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {!buyingEnabled && (
        <div className="mb-4 rounded-xl bg-mowing-green/10 border border-mowing-green/20 px-4 py-3 text-center text-sm text-mowing-green/90">
          Teevo is launching soon. Sellers can list gear today. Buying opens shortly.
        </div>
      )}
      {/* Hero: primary visual weight */}
      <header className="mb-8 rounded-2xl bg-mowing-green/5 border border-mowing-green/10 px-6 py-8 sm:px-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-mowing-green">
          Golf equipment for every game
        </h1>
        <p className="mt-2 text-mowing-green/80">
          Browse verified listings from UK sellers. Secure payment, no fuss.
        </p>
        <SmartSearchHero />
      </header>

      {/* Category shortcuts */}
      <CategoryShortcuts />

      {/* Filters: compact, secondary */}
      <Suspense fallback={<FiltersFallback />}>
        <ListingFilters />
      </Suspense>

      {/* Listings grid */}
      <ListingGrid searchParams={searchParams} />
    </div>
  );
}
