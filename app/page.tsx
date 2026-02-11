import { ListingGrid } from "@/components/listing/ListingGrid";
import { ListingFilters } from "@/components/listing/ListingFilters";

type SearchParams = { category?: string; brand?: string; minPrice?: string; maxPrice?: string };

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
      <ListingFilters />
      <ListingGrid searchParams={searchParams} />
    </div>
  );
}
