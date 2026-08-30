"use client";

import { formatPoundsCompact } from "@/components/creator/utils";
import type { CreatorHubJourneyStep } from "@/lib/creator/hub";

const STEP_COPY: Record<
  CreatorHubJourneyStep["key"],
  { emoji: string; title: string; detail: string }
> = {
  join: { emoji: "👋", title: "They join", detail: "New golfer signs up" },
  list: { emoji: "🏌️", title: "They list", detail: "First listing approved" },
  transact: { emoji: "💸", title: "They transact", detail: "First qualifying transaction" },
};

type Props = {
  steps: CreatorHubJourneyStep[];
  potentialTotalPence: number;
  id?: string;
};

export function CreatorRewardJourney({ steps, potentialTotalPence, id }: Props) {
  if (steps.length === 0) return null;

  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="text-lg font-bold text-mowing-green">How you earn</h2>
      <ol className="mt-3 space-y-0">
        {steps.map((step, i) => {
          const copy = STEP_COPY[step.key];
          return (
            <li key={step.key} className="relative flex gap-3 pb-4 last:pb-0">
              {i < steps.length - 1 && (
                <span
                  className="absolute left-[15px] top-8 h-[calc(100%-1.25rem)] w-0.5 bg-par-3-punch/35"
                  aria-hidden
                />
              )}
              <span
                className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-par-3-punch/20 text-base"
                aria-hidden
              >
                {copy.emoji}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="font-semibold text-mowing-green">{copy.title}</p>
                <p className="text-xs text-mowing-green/70">{copy.detail}</p>
                <p className="text-sm font-medium text-par-3-punch">
                  +{formatPoundsCompact(step.amountPence)} Teevo credit
                </p>
              </div>
            </li>
          );
        })}
        <li className="flex gap-3 border-t border-par-3-punch/15 pt-3">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-golden-tee/40 text-base"
            aria-hidden
          >
            🏆
          </span>
          <div className="pt-0.5">
            <p className="font-semibold text-mowing-green">
              Up to {formatPoundsCompact(potentialTotalPence)}
            </p>
            <p className="text-sm text-mowing-green/70">per successful referral</p>
          </div>
        </li>
      </ol>
    </section>
  );
}
