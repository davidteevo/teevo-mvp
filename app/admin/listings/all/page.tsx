import { Suspense } from "react";
import { getAllListings } from "@/lib/admin-data";
import AllListingsClient from "./AllListingsClient";

type Props = { searchParams: Promise<{ q?: string; status?: string }> };

export default async function AdminAllListingsPage({ searchParams }: Props) {
  const params = await searchParams;
  const listings = await getAllListings({ q: params.q, status: params.status });

  return (
    <div>
      <h1 className="text-2xl font-bold text-mowing-green">All listings</h1>
      <p className="mt-1 text-mowing-green/80">Search and delete listings. Listings with transactions cannot be deleted.</p>
      <Suspense fallback={<div className="mt-6 p-8 text-mowing-green/80">Loading…</div>}>
        <AllListingsClient listings={listings} />
      </Suspense>
    </div>
  );
}
