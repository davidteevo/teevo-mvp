import { ComingSoonBadge } from "@/components/trust/ComingSoonBadge";
import { VerifiedBadge } from "@/components/trust/VerifiedBadge";
import { isComingSoonListing } from "@/lib/listing-availability";

export function ListingMarketplaceBadge({
  status,
  buyingPaused,
  awaitingConfirmation,
}: {
  status: string;
  buyingPaused?: boolean;
  awaitingConfirmation?: boolean;
}) {
  if (isComingSoonListing(status)) return <ComingSoonBadge />;
  if (awaitingConfirmation) {
    return (
      <span className="inline-flex items-center rounded-full bg-golden-tee/90 text-mowing-green px-2 py-0.5 text-xs font-medium">
        Checking availability
      </span>
    );
  }
  if (buyingPaused) {
    return (
      <span className="inline-flex items-center rounded-full bg-golden-tee/90 text-mowing-green px-2 py-0.5 text-xs font-medium">
        Temporarily unavailable
      </span>
    );
  }
  return <VerifiedBadge />;
}
