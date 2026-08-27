"use client";

import { formatPoundsCompact } from "@/components/creator/utils";
import type { CreatorHubJourneyStep } from "@/lib/creator/hub";

const STEP_EMOJI: Record<CreatorHubJourneyStep["key"], string> = {
  join: "👤",
  list: "🏌️",
  transact: "💸",
};

type Props = {
  steps: CreatorHubJourneyStep[];
  potentialTotalPence: number;
  headline: string;
};

export function CreatorRewardJourney({ steps, potentialTotalPence, headline }: Props) {
  if (steps.length === 0) return null;

  return (
    <section className="rounded-2xl border border-par-3-punch/20 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-bold text-mowing-green">
        Turn a referral into {formatPoundsCompact(potentialTotalPence)}
      </h2>
      <ol className="mt-5 space-y-0">
        {steps.map((step, i) => (
          <li key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
            {i < steps.length - 1 && (
              <span
                className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-0.5 bg-par-3-punch/40"
                aria-hidden
              />
            )}
            <span
              className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-par-3-punch/20 text-base"
              aria-hidden
            >
              {STEP_EMOJI[step.key]}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="font-semibold text-mowing-green">{step.label}</p>
              <p className="text-sm text-par-3-punch font-medium">
                +{formatPoundsCompact(step.amountPence)}
              </p>
            </div>
          </li>
        ))}
        <li className="flex gap-3 border-t border-par-3-punch/15 pt-4">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-golden-tee/40 text-base"
            aria-hidden
          >
            🏆
          </span>
          <div className="pt-0.5">
            <p className="font-semibold text-mowing-green">
              You earned {formatPoundsCompact(potentialTotalPence)}
            </p>
            <p className="mt-1 text-sm text-mowing-green/70">{headline}</p>
          </div>
        </li>
      </ol>
    </section>
  );
}
