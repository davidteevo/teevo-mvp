"use client";

import { Check, Link2, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { formatPoundsCompact, prefersReducedMotion } from "@/components/creator/utils";
import { track } from "@/lib/analytics";

type Props = {
  earnedPence: number;
  pendingPence: number;
  opportunityPence: number;
  golfersReferred: number;
  successfulListings: number;
  successfulTransactions: number;
  onShare: () => void;
  onCopyLink: () => void;
  copiedLink: boolean;
  shareRef?: React.RefObject<HTMLDivElement>;
};

export function CreatorHubHero({
  earnedPence,
  pendingPence,
  opportunityPence,
  golfersReferred,
  successfulListings,
  successfulTransactions,
  onShare,
  onCopyLink,
  copiedLink,
  shareRef,
}: Props) {
  const [displayEarned, setDisplayEarned] = useState(earnedPence);

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
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-mowing-green via-mowing-green to-[#1a4035] px-5 py-5 text-off-white-pique sm:px-7 sm:py-6">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-par-3-punch/30 blur-2xl"
        aria-hidden
      />

      <p className="text-xs font-semibold uppercase tracking-wide text-off-white-pique/75">
        Creator Hub
      </p>
      <h1 className="mt-1 text-xl font-bold sm:text-2xl">
        You&apos;re building a squad <span aria-hidden>🚀</span>
      </h1>

      <p className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
        {formatPoundsCompact(displayEarned)}
      </p>
      <p className="mt-1 text-sm font-medium text-off-white-pique/85">
        Teevo credit earned so far
      </p>
      {pendingPence > 0 && (
        <p className="mt-2 inline-flex rounded-full bg-golden-tee/90 px-3 py-1 text-sm font-semibold text-mowing-green">
          {formatPoundsCompact(pendingPence)} pending
        </p>
      )}

      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-2xl font-bold">{golfersReferred}</p>
          <p className="mt-0.5 text-xs text-off-white-pique/75">Referred</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{successfulListings}</p>
          <p className="mt-0.5 text-xs text-off-white-pique/75">Listed</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{successfulTransactions}</p>
          <p className="mt-0.5 text-xs text-off-white-pique/75">Transacted</p>
        </div>
      </div>

      {opportunityPence > 0 && (
        <p className="mt-4 rounded-xl bg-golden-tee/25 px-3 py-2 text-sm font-semibold text-golden-tee">
          {formatPoundsCompact(opportunityPence)} still available from your current referrals
        </p>
      )}

      <div ref={shareRef} className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => {
            track("creator_share_clicked", { source: "hero" });
            onShare();
          }}
          className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-golden-tee px-4 py-3 text-sm font-semibold text-mowing-green hover:opacity-95"
        >
          <Share2 className="h-4 w-4" aria-hidden />
          Share Teevo 🚀
        </button>
        <button
          type="button"
          onClick={onCopyLink}
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-off-white-pique/40 bg-white/10 px-4 py-3 text-sm font-semibold text-off-white-pique hover:bg-white/15"
        >
          {copiedLink ? (
            <Check className="h-4 w-4" aria-hidden />
          ) : (
            <Link2 className="h-4 w-4" aria-hidden />
          )}
          {copiedLink ? "Copied ✓" : "Copy link"}
        </button>
      </div>
    </section>
  );
}
