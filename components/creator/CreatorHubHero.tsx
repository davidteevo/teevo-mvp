"use client";

import { Check, Link2, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { formatPoundsCompact, prefersReducedMotion } from "@/components/creator/utils";

type Props = {
  firstName: string | null;
  earnedPence: number;
  pendingPence: number;
  golfersReferred: number;
  rewardsThisWeek: number;
  onShare: () => void;
  onCopyLink: () => void;
  copiedLink: boolean;
  shareRef?: React.RefObject<HTMLDivElement>;
};

export function CreatorHubHero({
  firstName,
  earnedPence,
  pendingPence,
  golfersReferred,
  rewardsThisWeek,
  onShare,
  onCopyLink,
  copiedLink,
  shareRef,
}: Props) {
  const [displayEarned, setDisplayEarned] = useState(earnedPence);
  const greeting = firstName ? `Hey ${firstName}` : "Hey there";

  useEffect(() => {
    if (prefersReducedMotion() || earnedPence === 0) {
      setDisplayEarned(earnedPence);
      return;
    }
    const start = Math.max(0, earnedPence - Math.min(earnedPence, 1500));
    const duration = 700;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - (1 - t) * (1 - t);
      setDisplayEarned(Math.round(start + (earnedPence - start) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [earnedPence]);

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-mowing-green via-mowing-green to-[#1a4035] px-5 py-6 text-off-white-pique sm:px-7 sm:py-8">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-par-3-punch/30 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-10 left-1/3 h-28 w-28 rounded-full bg-golden-tee/25 blur-2xl"
        aria-hidden
      />

      <p className="text-lg font-semibold sm:text-xl">
        {greeting} <span aria-hidden>👋</span>
      </p>
      <p className="mt-3 text-sm text-off-white-pique/80">You&apos;ve earned</p>
      <p className="mt-1 text-4xl font-bold tracking-tight sm:text-5xl">
        {formatPoundsCompact(displayEarned)}
      </p>
      {pendingPence > 0 && (
        <p className="mt-2 inline-flex rounded-full bg-golden-tee/90 px-3 py-1 text-sm font-semibold text-mowing-green">
          {formatPoundsCompact(pendingPence)} pending
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm text-off-white-pique/90">
        <span>
          <strong className="font-semibold text-off-white-pique">{golfersReferred}</strong>{" "}
          golfer{golfersReferred === 1 ? "" : "s"} referred
        </span>
        {rewardsThisWeek > 0 && (
          <span>
            <span aria-hidden>🔥</span>{" "}
            <strong className="font-semibold text-off-white-pique">{rewardsThisWeek}</strong> reward
            {rewardsThisWeek === 1 ? "" : "s"} earned this week
          </span>
        )}
      </div>

      <div ref={shareRef} className="mt-6 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onShare}
          className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-golden-tee px-4 py-3 text-sm font-semibold text-mowing-green hover:opacity-95"
        >
          <Share2 className="h-4 w-4" aria-hidden />
          Share Teevo
        </button>
        <button
          type="button"
          onClick={onCopyLink}
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-off-white-pique/40 bg-white/10 px-4 py-3 text-sm font-semibold text-off-white-pique hover:bg-white/15"
        >
          {copiedLink ? <Check className="h-4 w-4" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
          {copiedLink ? "Copied ✓" : "Copy Creator Link"}
        </button>
      </div>
    </section>
  );
}
