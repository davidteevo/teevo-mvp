import { ReferralOfferPanel } from "@/components/referral/ReferralOfferPanel";

export function ReferralPromptCard({
  title,
  body,
  url,
  variant = "buyer",
  discountPence,
  referrerRewardPence,
}: {
  title?: string;
  body?: string;
  url: string | null;
  variant?: "buyer" | "seller";
  discountPence?: number;
  referrerRewardPence?: number;
}) {
  return (
    <div className="mt-6">
      <ReferralOfferPanel
        variant={variant}
        url={url}
        discountPence={discountPence}
        referrerRewardPence={referrerRewardPence}
        introTitle={title}
        introBody={body}
      />
    </div>
  );
}
