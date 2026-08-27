"use client";

import { Target } from "lucide-react";
import { track } from "@/lib/analytics";

type Props = {
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string | null;
  rewardCallout: string;
  onShareCta: () => void;
};

export function CreatorMissionCard({
  title,
  body,
  ctaLabel,
  ctaUrl,
  rewardCallout,
  onShareCta,
}: Props) {
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
    <section className="rounded-2xl border border-golden-tee/50 bg-golden-tee/20 p-5 sm:p-6">
      <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-mowing-green/80">
        <Target className="h-4 w-4" aria-hidden />
        Your Mission
      </p>
      <h2 className="mt-2 text-xl font-bold text-mowing-green sm:text-2xl">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-mowing-green/80">{body}</p>
      <button
        type="button"
        onClick={handleCta}
        className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-mowing-green px-4 py-3 text-sm font-semibold text-off-white-pique hover:opacity-90 sm:w-auto"
      >
        {ctaLabel}
      </button>
      {rewardCallout && (
        <p className="mt-3 text-sm text-mowing-green/90">{rewardCallout}</p>
      )}
    </section>
  );
}
