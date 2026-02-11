import { Suspense } from "react";
import { ListingGrid } from "@/components/listing/ListingGrid";
import { ListingFilters } from "@/components/listing/ListingFilters";

type SearchParams = { category?: string; brand?: string; minPrice?: string; maxPrice?: string };

function FiltersFallback() {
  return (
    <div className="flex flex-wrap gap-4 mb-6 p-4 rounded-xl bg-white/60 border border-par-3-punch/20 animate-pulse h-[72px]" />
  );
}

export default function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-mowing-green">
          Golf equipment for every game
        </h1>
        <p className="mt-2 text-mowing-green/80">
          Browse verified listings from UK sellers. Secure payment, no fuss.
        </p>
      </div>
      <Suspense fallback={<FiltersFallback />}>
        <ListingFilters />
      </Suspense>
      <ListingGrid searchParams={searchParams} />
    </div>
  );
}
