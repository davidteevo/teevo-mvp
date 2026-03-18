import { Suspense } from "react";
import { ListingGrid } from "@/components/listing/ListingGrid";
import { SmartSearchHero } from "@/components/listing/SmartSearchHero";
import { HomeFilterBar } from "@/components/listing/HomeFilterBar";
import { ActiveFilterChips } from "@/components/listing/ActiveFilterChips";
import { getFilterBrands } from "@/lib/filter-brands";

export type SearchParams = {
  category?: string;
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
  search?: string;
  shaft?: string;
  shaftFlex?: string;
  degree?: string;
  degreeMin?: string;
  handed?: string;
  item_type?: string;
  size?: string;
  condition?: string;
  sort?: string;
};

function FilterBarFallback() {
  return (
    <div className="mb-4 h-14 animate-pulse rounded-full bg-mowing-green/10" aria-hidden />
  );
}

const buyingEnabled = process.env.NEXT_PUBLIC_BUYING_ENABLED !== "false";

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const brandSuggestions = getFilterBrands();
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

      <Suspense fallback={<FilterBarFallback />}>
        <HomeFilterBar brandSuggestions={brandSuggestions} />
      </Suspense>

      <Suspense fallback={null}>
        <ActiveFilterChips />
      </Suspense>

      <ListingGrid searchParams={searchParams} />
    </div>
  );
}
