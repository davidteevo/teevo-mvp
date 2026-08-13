"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";
import type { MarketplaceListingStatus } from "@/lib/listing-availability";

export function ListingViewTracker({
  listingId,
  listingStatus,
}: {
  listingId: string;
  listingStatus: MarketplaceListingStatus;
}) {
  useEffect(() => {
    track("listing_viewed", { listingId, listing_status: listingStatus });
  }, [listingId, listingStatus]);
  return null;
}
