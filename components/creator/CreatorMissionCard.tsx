"use client";

import { useEffect, useRef, useState } from "react";
import { Target } from "lucide-react";
import { formatPoundsCompact, prefersReducedMotion } from "@/components/creator/utils";
import { track } from "@/lib/analytics";

type Props = {
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string | null;
  rewardCallout: string;
  progressCurrent: number;
  progressTarget: number;
  potentialRewardPence: number;
  onShareCta: () => void;
  id?: string;
};

export function CreatorMissionCard({
  title,
  body,
  ctaLabel,
  ctaUrl,
  rewardCallout,
  progressCurrent,
  progressTarget,
  potentialRewardPence,
  onShareCta,
  id,
}: Props) {
  const [width, setWidth] = useState(0);
  const reduced = useRef(false);

  const pct =
    progressTarget > 0 ? Math.min(100, Math.round((progressCurrent / progressTarget) * 100)) : 0;

  useEffect(() => {
    reduced.current = prefersReducedMotion();
    if (reduced.current) {
      setWidth(pct);
      return;
    }
    setWidth(0);
    const t = window.setTimeout(() => setWidth(pct), 50);
    return () => window.clearTimeout(t);
  }, [pct]);

  const handleCta = () => {
    track("creator_mission_cta_clicked", { hasUrl: Boolean(ctaUrl) });
    if (ctaUrl) {
      if (ctaUrl.startsWith("http")) {
        window.open(ctaUrl, "_blank", "noopener,noreferrer");
      } else {
        window.location.href = ctaUrl;
      }
      return;
    }
    onShareCta();
  };

  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-2xl border border-golden-tee/50 bg-golden-tee/20 p-4 sm:p-5"
    >
      <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-mowing-green/80">
        <Target className="h-3.5 w-3.5" aria-hidden />
        Your Mission <span aria-hidden>🎯</span>
      </p>
      <h2 className="mt-1.5 text-lg font-bold text-mowing-green sm:text-xl">{title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-mowing-green/80">{body}</p>

      {progressTarget > 0 && (
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-mowing-green">
              {progressCurrent} / {progressTarget}
            </p>
            {potentialRewardPence > 0 && (
              <p className="text-sm text-mowing-green/80">
                Potential: {formatPoundsCompact(potentialRewardPence)} Teevo credit
              </p>
            )}
          </div>
          <div
            className="mt-2 h-2.5 overflow-hidden rounded-full bg-mowing-green/15"
            role="progressbar"
            aria-valuenow={progressCurrent}
            aria-valuemin={0}
            aria-valuemax={progressTarget}
            aria-label={`Mission progress ${progressCurrent} of ${progressTarget}`}
          >
            <div
              className="h-full rounded-full bg-mowing-green transition-[width] duration-700 ease-out motion-reduce:transition-none"
              style={{ width: `${width}%` }}
            />
          </div>
        </div>
      )}

      {rewardCallout && (
        <p className="mt-3 text-sm text-mowing-green/90">{rewardCallout}</p>
      )}

      <button
        type="button"
        onClick={handleCta}
        className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-mowing-green px-4 py-3 text-sm font-semibold text-off-white-pique hover:opacity-90 sm:w-auto"
      >
        {ctaLabel}
      </button>
    </section>
  );
}
