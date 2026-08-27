"use client";

import { formatPoundsCompact } from "@/components/creator/utils";
import { CreatorRewardJourney } from "@/components/creator/CreatorRewardJourney";
import { CreatorSharePanel } from "@/components/creator/CreatorSharePanel";
import { CreatorToolkit } from "@/components/creator/CreatorToolkit";
import type { CreatorHubJourneyStep } from "@/lib/creator/hub";

type Props = {
  steps: CreatorHubJourneyStep[];
  potentialTotalPence: number;
  headline: string;
  url: string;
  code: string;
  toolkit: { id: string; title: string; caption: string }[];
};

export function CreatorEmptyState({
  steps,
  potentialTotalPence,
  headline,
  url,
  code,
  toolkit,
}: Props) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-mowing-green to-[#1a4035] px-5 py-7 text-off-white-pique sm:px-7">
        <p className="text-sm font-medium text-off-white-pique/80">Creator Hub</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
          Your Creator journey starts here <span aria-hidden>🚀</span>
        </h1>
        <p className="mt-3 text-base text-off-white-pique/90">
          Turn your audience into Teevo&apos;s next sellers.
        </p>
        <p className="mt-5 text-sm font-semibold text-golden-tee">Your current earning opportunity</p>
        <ul className="mt-3 space-y-2 text-sm">
          {steps.map((s) => (
            <li key={s.key} className="flex items-center justify-between gap-3">
              <span>
                {s.key === "join" && "👤 Join"}
                {s.key === "list" && "🏌️ List"}
                {s.key === "transact" && "💸 Transact"}
              </span>
              <strong>+{formatPoundsCompact(s.amountPence)}</strong>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-lg font-bold">
          One successful referral = up to{" "}
          <span className="text-golden-tee">{formatPoundsCompact(potentialTotalPence)}</span>
        </p>
      </section>

      <CreatorSharePanel url={url} code={code} id="creator-share" />
      <CreatorRewardJourney
        steps={steps}
        potentialTotalPence={potentialTotalPence}
        headline={headline}
      />
      <div>
        <p className="mb-2 text-sm font-semibold text-mowing-green">Need something to post?</p>
        <CreatorToolkit captions={toolkit} />
      </div>
    </div>
  );
}
