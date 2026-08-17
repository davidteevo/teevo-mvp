import Link from "next/link";
import { formatPoundsCompact } from "@/lib/pricing";
import { ReferralProcessSteps } from "@/components/referral/ReferralProcessSteps";
import { ReferralShareActions } from "@/components/referral/ReferralShareActions";

function ScribbleUnderline() {
  return (
    <svg
      viewBox="0 0 88 10"
      className="absolute -bottom-1 left-0 w-full"
      fill="none"
      aria-hidden
    >
      <path
        d="M2 7C18 2.5 36 9.5 86 4"
        stroke="#FFD25E"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ReferralOfferPanel({
  variant = "buyer",
  url,
  discountPence = 500,
  referrerRewardPence = 500,
  introTitle,
  introBody,
  code,
  headingAs = "h2",
}: {
  variant?: "buyer" | "seller";
  url: string | null;
  discountPence?: number;
  referrerRewardPence?: number;
  introTitle?: string;
  introBody?: string;
  code?: string | null;
  headingAs?: "h1" | "h2";
}) {
  const discount = formatPoundsCompact(discountPence);
  const reward = formatPoundsCompact(referrerRewardPence);
  const isSeller = variant === "seller";
  const shareLabel = isSeller ? "Invite a seller" : `Share ${discount} with a friend`;
  const Heading = headingAs;

  return (
    <div className="rounded-2xl border border-par-3-punch/25 bg-par-3-punch/15 p-5 sm:p-8">
      {introTitle && (
        <p className="mb-4 text-base font-semibold text-mowing-green">{introTitle}</p>
      )}
      {introBody && <p className="mb-4 text-sm text-mowing-green/80">{introBody}</p>}

      {isSeller ? (
        <Heading className="text-3xl font-bold tracking-tight text-mowing-green sm:text-4xl">
          Invite a seller.
          <br />
          Earn credit.
        </Heading>
      ) : (
        <Heading className="text-3xl font-bold tracking-tight text-mowing-green sm:text-4xl">
          Give{" "}
          <span className="relative inline-block">
            {discount}
            <ScribbleUnderline />
          </span>
          . Get {reward}.
        </Heading>
      )}

      <p className="mt-3 text-sm leading-relaxed text-mowing-green/80 sm:text-base">
        {isSeller
          ? "Know someone with clubs gathering dust? Invite them to Teevo and earn credit when they start selling."
          : `Give a friend ${discount} off their first Teevo purchase. When they buy, you'll get ${reward} Teevo credit.`}
      </p>

      <ReferralProcessSteps
        variant={variant}
        discountLabel={discount}
        rewardLabel={reward}
      />

      <div className="mt-6">
        {url ? (
          <ReferralShareActions url={url} variant={variant} shareLabel={shareLabel} />
        ) : (
          <Link
            href="/dashboard/referrals"
            className="inline-flex w-full items-center justify-center rounded-xl bg-mowing-green px-4 py-3.5 text-sm font-semibold text-off-white-pique hover:opacity-90"
          >
            {shareLabel}
          </Link>
        )}
      </div>

      {code && (
        <p className="mt-4 text-center text-xs text-mowing-green/55">
          Your code: <span className="font-semibold tracking-wide text-mowing-green/80">{code}</span>
        </p>
      )}

      <p className="mt-3 text-center text-xs text-mowing-green/55">
        {isSeller
          ? "Credit is added after they list or complete a sale."
          : `New Teevo users only. ${reward} credit added after their first completed purchase.`}
      </p>
    </div>
  );
}
