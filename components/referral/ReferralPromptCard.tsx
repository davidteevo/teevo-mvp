import { ReferralOfferPanel } from "@/components/referral/ReferralOfferPanel";

export function ReferralPromptCard({
  title,
  body,
  url,
  variant = "buyer",
  discountPence,
  referrerRewardPence,
  compact = false,
}: {
  title?: string;
  body?: string;
  url: string | null;
  variant?: "buyer" | "seller";
  discountPence?: number;
  referrerRewardPence?: number;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "mt-4" : "mt-6"}>
      <ReferralOfferPanel
        variant={variant}
        url={url}
        discountPence={discountPence}
        referrerRewardPence={referrerRewardPence}
        introTitle={title}
        introBody={body}
        compact={compact}
      />
    </div>
  );
}
