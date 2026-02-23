import { getPendingListings } from "@/lib/admin-data";
import PendingListingsTable from "./PendingListingsTable";

export default async function AdminListingsPendingPage() {
  const listings = await getPendingListings();
  return (
    <div>
      <h1 className="text-2xl font-bold text-mowing-green">Pending listings</h1>
      <p className="mt-1 text-mowing-green/80">Approve or reject. Flag suspicious items.</p>
      <div className="mt-6">
        <PendingListingsTable listings={listings} />
      </div>
    </div>
  );
}
