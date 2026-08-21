"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { track } from "@/lib/analytics";
import { formatPoundsCompact } from "@/lib/pricing";
import { ReferralPriority, type ReferralPriorityValue } from "@/lib/referral/types";

export function BrowseReferralCard({
  priority,
  discountPence,
  referrerRewardPence,
  sellerListingRewardPence,
  isFoundingMember,
}: {
  priority: ReferralPriorityValue;
  discountPence: number;
  referrerRewardPence: number;
  sellerListingRewardPence: number;
  isFoundingMember: boolean;
}) {
  const isSupply = priority === ReferralPriority.SUPPLY;
  const campaignType = isSupply ? "listing" : "buying";
  const discount = formatPoundsCompact(discountPence);
  const reward = formatPoundsCompact(referrerRewardPence);
  const listingReward = formatPoundsCompact(sellerListingRewardPence);
  const giveAmount = isSupply ? listingReward : discount;
  const getAmount = isSupply ? listingReward : reward;

  const body = isFoundingMember
    ? isSupply
      ? `You're a Founding Member — that means you receive ${listingReward} of credit for every friend you refer who creates a listing!`
      : `You're a Founding Member — that means you receive ${reward} of credit for every friend you refer who makes their first purchase!`
    : isSupply
      ? `When they list a qualifying club, they get ${listingReward} Teevo credit and you get ${listingReward} credit too.`
      : `Give a mate ${discount} off their first purchase. Once they successfully buy, you'll get ${reward} Teevo credit too.`;

  const subhead = isFoundingMember
    ? null
    : isSupply
      ? `Invite a mate to sell. You both get ${listingReward}.`
      : `Give ${discount}. Get ${reward}.`;

  useEffect(() => {
    track("browse_referral_card_viewed", {
      campaign_type: campaignType,
      is_founding_member: isFoundingMember,
    });
  }, [campaignType, isFoundingMember]);

  return (
    <section
      className="mb-8 rounded-2xl border border-par-3-punch/25 bg-par-3-punch/15 px-5 py-6 sm:px-8 sm:py-8"
      aria-labelledby="browse-referral-heading"
    >
      <p className="text-xs font-semibold tracking-wide text-mowing-green/80">
        GIVE {giveAmount} • GET {getAmount}
      </p>
      <h2
        id="browse-referral-heading"
        className="mt-2 text-2xl font-bold leading-tight text-mowing-green sm:text-3xl"
      >
        Golf&apos;s better with mates.
      </h2>
      {subhead && <p className="mt-2 text-base font-semibold text-mowing-green">{subhead}</p>}
      <p className="mt-2 text-sm text-mowing-green/80 sm:text-base">{body}</p>
      <Link
        href="/dashboard/referrals"
        onClick={() =>
          track("browse_referral_cta_clicked", {
            campaign_type: campaignType,
            is_founding_member: isFoundingMember,
          })
        }
        className="group mt-5 inline-flex items-center gap-2 rounded-xl bg-mowing-green px-5 py-3 text-sm font-semibold text-off-white-pique hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mowing-green"
      >
        Refer a friend →
        <ArrowRight
          className="h-4 w-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
          aria-hidden
        />
      </Link>
    </section>
  );
}
