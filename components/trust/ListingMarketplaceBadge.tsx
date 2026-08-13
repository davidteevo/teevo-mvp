import { ComingSoonBadge } from "@/components/trust/ComingSoonBadge";
import { VerifiedBadge } from "@/components/trust/VerifiedBadge";
import { isComingSoonListing } from "@/lib/listing-availability";

export function ListingMarketplaceBadge({ status }: { status: string }) {
  if (isComingSoonListing(status)) return <ComingSoonBadge />;
  return <VerifiedBadge />;
}
