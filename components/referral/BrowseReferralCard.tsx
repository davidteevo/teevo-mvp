"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { ArrowRight, Gift, UserPlus } from "lucide-react";
import { track } from "@/lib/analytics";
import { formatPoundsCompact } from "@/lib/pricing";
import { ReferralPriority, type ReferralPriorityValue } from "@/lib/referral/types";

function Sparkles({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      aria-hidden
    >
      <path
        d="M4 8V4M4 4H8M4 4L8 8M20 8V4M20 4H16M20 4L16 8M4 16V20M4 20H8M4 20L8 16M20 16V20M20 20H16M20 20L16 16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RewardTile({ amount, label }: { amount: string; label: string }) {
  return (
    <div className="relative flex min-w-[5.5rem] flex-col items-center rounded-2xl border border-golden-tee/70 bg-off-white-pique px-4 py-3 shadow-sm sm:min-w-[6.25rem] sm:px-5 sm:py-3.5">
      <Sparkles className="pointer-events-none absolute -left-1.5 -top-1.5 h-4 w-4 text-golden-tee" />
      <Sparkles className="pointer-events-none absolute -bottom-1.5 -right-1.5 h-4 w-4 rotate-180 text-golden-tee" />
      <p className="font-sans text-2xl font-bold tabular-nums leading-none text-mowing-green sm:text-3xl">
        {amount}
      </p>
      <p className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-mowing-green/75">
        <Gift className="h-3 w-3 text-golden-tee" aria-hidden />
        {label}
      </p>
    </div>
  );
}

function ReferralIllustration({
  themAmount,
  youAmount,
}: {
  themAmount: string;
  youAmount: string;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center gap-4">
      <div className="relative flex items-center gap-3 sm:gap-4" aria-hidden>
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-mowing-green/20 bg-mowing-green/10 sm:h-14 sm:w-14">
          <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden>
            <circle cx="20" cy="15" r="7" fill="#265C4B" opacity="0.55" />
            <ellipse cx="20" cy="32" rx="12" ry="10" fill="#265C4B" opacity="0.4" />
          </svg>
        </div>
        <div className="relative flex w-14 items-center justify-center sm:w-16">
          <div className="absolute inset-x-0 top-1/2 h-px border-t border-dashed border-mowing-green/35" />
          <span className="absolute right-0 top-1/2 -translate-y-1/2 text-mowing-green/50">›</span>
          <div className="relative z-10 rounded-full bg-off-white-pique p-0.5 shadow-sm ring-1 ring-mowing-green/10">
            <Image
              src="/logo-icon.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
            />
          </div>
        </div>
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-golden-tee/60 bg-golden-tee/30 sm:h-14 sm:w-14">
          <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden>
            <path
              d="M8 14h24v4c0 2-2 3-4 3H12c-2 0-4-1-4-3v-4z"
              fill="#265C4B"
              opacity="0.35"
            />
            <circle cx="20" cy="16" r="7" fill="#265C4B" opacity="0.55" />
            <ellipse cx="20" cy="33" rx="12" ry="9" fill="#265C4B" opacity="0.4" />
          </svg>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3">
        <RewardTile amount={themAmount} label="For them" />
        <span className="text-2xl font-bold text-mowing-green" aria-hidden>
          +
        </span>
        <RewardTile amount={youAmount} label="For you" />
      </div>
    </div>
  );
}

export function BrowseReferralCard({
  priority,
  discountPence,
  referrerRewardPence,
  sellerListingRewardPence,
}: {
  priority: ReferralPriorityValue;
  discountPence: number;
  referrerRewardPence: number;
  sellerListingRewardPence: number;
}) {
  const isSupply = priority === ReferralPriority.SUPPLY;
  const campaignType = isSupply ? "listing" : "buying";
  const discount = formatPoundsCompact(discountPence);
  const reward = formatPoundsCompact(referrerRewardPence);
  const listingReward = formatPoundsCompact(sellerListingRewardPence);
  const themAmount = isSupply ? listingReward : discount;
  const youAmount = isSupply ? listingReward : reward;

  const body = isSupply
    ? `Invite a friend to Teevo. When they list their first qualifying club, you both earn ${listingReward} credit.`
    : `Give a friend ${discount} off their first purchase. When they buy, you'll earn ${reward} Teevo credit too.`;

  useEffect(() => {
    track("browse_referral_card_viewed", { campaign_type: campaignType });
  }, [campaignType]);

  return (
    <section
      className="relative mb-8 overflow-hidden rounded-2xl border border-mowing-green/20 bg-par-3-punch/15 px-4 py-5 sm:px-7 sm:py-6"
      aria-labelledby="browse-referral-heading"
    >
      {/* Decorative background */}
      <div
        className="pointer-events-none absolute left-3 top-3 grid grid-cols-3 gap-1.5 opacity-30"
        aria-hidden
      >
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} className="h-1 w-1 rounded-full bg-mowing-green" />
        ))}
      </div>
      <div
        className="pointer-events-none absolute -bottom-6 left-0 right-0 h-16 opacity-40"
        aria-hidden
      >
        <svg viewBox="0 0 600 64" className="h-full w-full" preserveAspectRatio="none">
          <path
            d="M0 40 Q150 10 300 36 T600 28 V64 H0 Z"
            fill="#265C4B"
            fillOpacity="0.08"
          />
          <path
            d="M0 48 Q180 24 360 44 T600 36 V64 H0 Z"
            fill="#265C4B"
            fillOpacity="0.06"
          />
        </svg>
      </div>
      <div
        className="pointer-events-none absolute bottom-3 right-4 text-mowing-green/25"
        aria-hidden
      >
        <svg viewBox="0 0 20 24" className="h-5 w-4" fill="currentColor">
          <path d="M3 22V4l12 2.5-2 1.5 2 1.5L3 12v10z" />
          <rect x="2" y="21" width="4" height="2" rx="0.5" />
        </svg>
      </div>
      <div
        className="pointer-events-none absolute right-16 top-4 h-16 w-16 rounded-full bg-golden-tee/25 blur-2xl sm:right-24 sm:h-24 sm:w-24"
        aria-hidden
      />

      <div className="relative grid gap-6 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:items-center md:gap-8">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-mowing-green/20 bg-off-white-pique/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-mowing-green">
            <UserPlus className="h-3.5 w-3.5" aria-hidden />
            Refer a mate
          </p>

          <h2
            id="browse-referral-heading"
            className="mt-3 text-2xl font-bold leading-tight text-mowing-green sm:text-3xl"
          >
            Golf&apos;s better with mates.
          </h2>

          {/* Mobile reward visual (between headline and copy) */}
          <div className="mt-4 md:hidden">
            <ReferralIllustration themAmount={themAmount} youAmount={youAmount} />
            <p className="sr-only">
              {themAmount} for them plus {youAmount} for you.
            </p>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-mowing-green/80 sm:text-[15px]">
            {body}
          </p>

          <Link
            href="/dashboard/referrals"
            onClick={() =>
              track("browse_referral_cta_clicked", { campaign_type: campaignType })
            }
            className="group mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-mowing-green px-5 py-3 text-sm font-semibold text-off-white-pique motion-safe:transition-[transform,opacity] motion-safe:duration-200 hover:opacity-95 motion-safe:hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mowing-green sm:mt-5 sm:w-auto"
          >
            Refer a friend
            <ArrowRight
              className="h-4 w-4 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-x-1"
              aria-hidden
            />
          </Link>
        </div>

        {/* Desktop reward visual */}
        <div className="relative hidden md:flex md:justify-center md:justify-self-end">
          <div
            className="pointer-events-none absolute inset-0 scale-110 rounded-full bg-golden-tee/20 blur-xl"
            aria-hidden
          />
          <div className="relative">
            <ReferralIllustration themAmount={themAmount} youAmount={youAmount} />
            <p className="sr-only">
              {themAmount} for them plus {youAmount} for you.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
