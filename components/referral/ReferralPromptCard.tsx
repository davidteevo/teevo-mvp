import { ReferralOfferPanel } from "@/components/referral/ReferralOfferPanel";
import type { ReferralPriorityValue } from "@/lib/referral/types";

export function ReferralPromptCard({
  title,
  body,
  url,
  priority,
  variant,
  discountPence,
  referrerRewardPence,
  sellerListingRewardPence,
  compact = false,
}: {
  title?: string;
  body?: string;
  url: string | null;
  priority?: ReferralPriorityValue;
  variant?: "buyer" | "seller";
  discountPence?: number;
  referrerRewardPence?: number;
  sellerListingRewardPence?: number;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "mt-4" : "mt-6"}>
      <ReferralOfferPanel
        priority={priority}
        variant={variant}
        url={url}
        discountPence={discountPence}
        referrerRewardPence={referrerRewardPence}
        sellerListingRewardPence={sellerListingRewardPence}
        introTitle={title}
        introBody={body}
        compact={compact}
      />
    </div>
  );
}
