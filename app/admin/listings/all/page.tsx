import { Suspense } from "react";
import { getAllListings } from "@/lib/admin-data";
import AllListingsClient from "./AllListingsClient";

type Props = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    createdBefore?: string;
    buying?: string;
    availability?: string;
  }>;
};

export default async function AdminAllListingsPage({ searchParams }: Props) {
  const params = await searchParams;
  const listings = await getAllListings({
    q: params.q,
    status: params.status,
    createdBefore: params.createdBefore,
    buying: params.buying,
    availability: params.availability,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-mowing-green">All listings</h1>
      <p className="mt-1 text-mowing-green/80">
        Search, pause buying, or ask sellers to reconfirm availability. Listings with transactions cannot be deleted.
      </p>
      <Suspense fallback={<div className="mt-6 p-8 text-mowing-green/80">Loading…</div>}>
        <AllListingsClient listings={listings} />
      </Suspense>
    </div>
  );
}
