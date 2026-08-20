import Link from "next/link";
import { formatPoundsCompact } from "@/lib/pricing";
import { ReferralProcessSteps } from "@/components/referral/ReferralProcessSteps";
import { ReferralShareActions } from "@/components/referral/ReferralShareActions";
import type { ReferralPriorityValue } from "@/lib/referral/types";
import { ReferralPriority } from "@/lib/referral/types";

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
  priority,
  variant,
  url,
  discountPence = 500,
  referrerRewardPence = 500,
  sellerListingRewardPence = 500,
  introTitle,
  introBody,
  code,
  headingAs = "h2",
  compact = false,
}: {
  /** Prefer this over variant for primary Refer a Friend surfaces. */
  priority?: ReferralPriorityValue;
  /** @deprecated Prefer priority. Kept for callers that still pass buyer/seller. */
  variant?: "buyer" | "seller";
  url: string | null;
  discountPence?: number;
  referrerRewardPence?: number;
  sellerListingRewardPence?: number;
  introTitle?: string;
  introBody?: string;
  code?: string | null;
  headingAs?: "h1" | "h2";
  compact?: boolean;
}) {
  const resolvedPriority: ReferralPriorityValue =
    priority ??
    (variant === "seller" ? ReferralPriority.SUPPLY : ReferralPriority.DEMAND);
  const isSupply = resolvedPriority === ReferralPriority.SUPPLY;

  const discount = formatPoundsCompact(discountPence);
  const reward = formatPoundsCompact(referrerRewardPence);
  const listingReward = formatPoundsCompact(sellerListingRewardPence);
  const shareLabel = isSupply
    ? "Invite a friend"
    : `Share ${discount} with a friend`;
  const Heading = headingAs;

  return (
    <div
      className={`rounded-2xl border border-par-3-punch/25 bg-par-3-punch/15 ${
        compact ? "p-4 sm:p-5" : "p-5 sm:p-8"
      }`}
    >
      {introTitle && (
        <p
          className={`font-semibold text-mowing-green ${
            compact ? "mb-1.5 text-sm" : "mb-4 text-base"
          }`}
        >
          {introTitle}
        </p>
      )}
      {!compact && introBody && <p className="mb-4 text-sm text-mowing-green/80">{introBody}</p>}

      {isSupply ? (
        <Heading
          className={`font-bold tracking-tight text-mowing-green ${
            compact ? "text-xl sm:text-2xl" : "text-3xl sm:text-4xl"
          }`}
        >
          {compact ? (
            <>Invite a friend. You both get {listingReward}.</>
          ) : (
            <>
              Invite a friend.
              <br />
              You both get {listingReward}.
            </>
          )}
        </Heading>
      ) : (
        <Heading
          className={`font-bold tracking-tight text-mowing-green ${
            compact ? "text-xl sm:text-2xl" : "text-3xl sm:text-4xl"
          }`}
        >
          Give{" "}
          <span className="relative inline-block">
            {discount}
            <ScribbleUnderline />
          </span>
          . Get {reward}.
        </Heading>
      )}

      <p
        className={`leading-relaxed text-mowing-green/80 ${
          compact ? "mt-1.5 text-sm" : "mt-3 text-sm sm:text-base"
        }`}
      >
        {isSupply
          ? `Share your Teevo link with a friend. When their first listing is approved, you'll both get ${listingReward} Teevo credit.`
          : `Give a friend ${discount} off their first Teevo purchase. When they buy, you'll get ${reward} Teevo credit.`}
      </p>

      {!compact && (
        <ReferralProcessSteps
          priority={resolvedPriority}
          discountLabel={discount}
          rewardLabel={isSupply ? listingReward : reward}
        />
      )}

      <div className={compact ? "mt-3" : "mt-6"}>
        {url ? (
          <ReferralShareActions
            url={url}
            priority={resolvedPriority}
            shareLabel={shareLabel}
            compact={compact}
            discountPence={discountPence}
            sellerListingRewardPence={sellerListingRewardPence}
          />
        ) : (
          <Link
            href="/dashboard/referrals"
            className={`inline-flex w-full items-center justify-center rounded-xl bg-mowing-green text-sm font-semibold text-off-white-pique hover:opacity-90 ${
              compact ? "px-3 py-2.5" : "px-4 py-3.5"
            }`}
          >
            {shareLabel}
          </Link>
        )}
      </div>

      {!compact && code && (
        <p className="mt-4 text-center text-xs text-mowing-green/55">
          Your code: <span className="font-semibold tracking-wide text-mowing-green/80">{code}</span>
        </p>
      )}

      {!compact && (
        <p className="mt-3 text-center text-xs text-mowing-green/55">
          {isSupply
            ? `New Teevo users only. ${listingReward} credit for each of you after their first listing is verified.`
            : `New Teevo users only. ${reward} credit added after their first completed purchase.`}
        </p>
      )}
    </div>
  );
}
