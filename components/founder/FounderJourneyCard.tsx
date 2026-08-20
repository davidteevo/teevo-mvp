"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Circle } from "lucide-react";
import { ReferralShareActions } from "@/components/referral/ReferralShareActions";
import { track } from "@/lib/analytics";
import { FOUNDER_EVENTS } from "@/lib/founder/types";

type Props = {
  founderNumber: number;
  rewardStatus: "eligible" | "earned" | "none";
};

export function FounderJourneyCard({ founderNumber, rewardStatus }: Props) {
  const [showCelebration, setShowCelebration] = useState(false);
  const [dismissedCelebration, setDismissedCelebration] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const earned = rewardStatus === "earned";
  const eligible = rewardStatus === "eligible";

  useEffect(() => {
    if (!earned || typeof window === "undefined") return;
    const key = `founder_reward_celebrated_${founderNumber}`;
    if (sessionStorage.getItem(key)) return;
    setShowCelebration(true);
    sessionStorage.setItem(key, "1");
  }, [earned, founderNumber]);

  useEffect(() => {
    if (!showCelebration) return;
    fetch("/api/referral/me")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d?.url === "string") setShareUrl(d.url);
      })
      .catch(() => {});
  }, [showCelebration]);

  if (rewardStatus === "none") return null;

  if (showCelebration && !dismissedCelebration) {
    return (
      <div className="rounded-xl border border-golden-tee/50 bg-golden-tee/20 p-4 sm:p-5">
        <p className="text-2xl" aria-hidden>
          🎉
        </p>
        <h2 className="mt-2 text-lg font-bold text-mowing-green">£5 earned!</h2>
        <p className="mt-1 text-sm text-mowing-green/80">
          Your first club is live and we&apos;ve added £5 Teevo credit to your account.
        </p>
        <div className="mt-4">
          <h3 className="font-semibold text-mowing-green">Know another golfer?</h3>
          <p className="mt-1 text-sm text-mowing-green/75 mb-3">Invite them to Teevo.</p>
          {shareUrl ? (
            <div
              onClickCapture={() =>
                track(FOUNDER_EVENTS.REFERRAL_SHARED, { founder_number: founderNumber })
              }
            >
              <ReferralShareActions url={shareUrl} variant="seller" shareLabel="Share my invite →" />
            </div>
          ) : (
            <Link
              href="/dashboard/referrals"
              className="inline-flex rounded-xl bg-mowing-green px-4 py-2.5 text-sm font-semibold text-off-white-pique"
            >
              Share my invite →
            </Link>
          )}
        </div>
        <button
          type="button"
          className="mt-4 text-sm font-medium text-mowing-green/70 hover:underline"
          onClick={() => setDismissedCelebration(true)}
        >
          Continue to dashboard
        </button>
      </div>
    );
  }

  if (earned) {
    return (
      <div className="rounded-xl border border-par-3-punch/25 bg-white p-4">
        <h2 className="text-sm font-semibold text-mowing-green">Your Founder journey</h2>
        <ul className="mt-3 space-y-2 text-sm text-mowing-green/85">
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-par-3-punch" aria-hidden />
            Founder #{String(founderNumber).padStart(3, "0")} secured
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-par-3-punch" aria-hidden />
            First club listed
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-par-3-punch" aria-hidden />
            £5 Teevo credit earned
          </li>
        </ul>
      </div>
    );
  }

  if (!eligible) return null;

  return (
    <div className="rounded-xl border border-golden-tee/40 bg-golden-tee/15 p-4 sm:p-5">
      <p className="text-sm font-semibold text-mowing-green">
        Founder #{String(founderNumber).padStart(3, "0")} — your £5 is waiting
      </p>
      <p className="mt-1 text-sm text-mowing-green/80">
        List your first club to unlock your Founder credit.
      </p>
      <h2 className="mt-4 text-sm font-semibold text-mowing-green">Your Founder journey</h2>
      <ul className="mt-2 space-y-2 text-sm text-mowing-green/85">
        <li className="flex items-center gap-2">
          <Check className="h-4 w-4 text-par-3-punch" aria-hidden />
          Founder #{String(founderNumber).padStart(3, "0")} secured
        </li>
        <li className="flex items-center gap-2">
          <Circle className="h-4 w-4 text-mowing-green/40" aria-hidden />
          List your first club
        </li>
        <li className="flex items-center gap-2">
          <Circle className="h-4 w-4 text-mowing-green/40" aria-hidden />
          Earn £5 Teevo credit
        </li>
      </ul>
      <Link
        href="/sell"
        onClick={() =>
          track(FOUNDER_EVENTS.LISTING_STARTED, { founder_number: founderNumber })
        }
        className="mt-4 inline-flex rounded-xl bg-mowing-green px-4 py-2.5 text-sm font-semibold text-off-white-pique hover:opacity-95"
      >
        List a club →
      </Link>
    </div>
  );
}
