"use client";

import { Share2 } from "lucide-react";
import { formatPoundsCompact } from "@/components/creator/utils";
import type { CreatorHubJourneyStep } from "@/lib/creator/hub";
import { track } from "@/lib/analytics";

type Props = {
  steps: CreatorHubJourneyStep[];
  potentialTotalPence: number;
  onShare: () => void;
  shareRef?: React.RefObject<HTMLDivElement>;
};

export function CreatorEmptyState({
  steps,
  potentialTotalPence,
  onShare,
  shareRef,
}: Props) {
  const listStep = steps.find((s) => s.key === "list");
  const txStep = steps.find((s) => s.key === "transact");
  const joinStep = steps.find((s) => s.key === "join");

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-mowing-green to-[#1a4035] px-5 py-6 text-off-white-pique sm:px-7">
      <p className="text-xs font-semibold uppercase tracking-wide text-off-white-pique/75">
        Creator Hub
      </p>
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
        Your first {formatPoundsCompact(potentialTotalPence || 0)} starts here{" "}
        <span aria-hidden>🚀</span>
      </h1>
      <p className="mt-3 text-base text-off-white-pique/90">Refer a golfer to Teevo.</p>

      {(listStep || txStep || joinStep) && (
        <ul className="mt-4 space-y-2 text-sm text-off-white-pique/90">
          {joinStep && (
            <li>
              Earn <strong>{formatPoundsCompact(joinStep.amountPence)}</strong> when they join
            </li>
          )}
          {listStep && (
            <li>
              Earn <strong>{formatPoundsCompact(listStep.amountPence)}</strong> when their first
              listing is approved
            </li>
          )}
          {txStep && (
            <li>
              + <strong>{formatPoundsCompact(txStep.amountPence)}</strong> when they complete their
              first transaction
            </li>
          )}
        </ul>
      )}

      <div ref={shareRef} className="mt-6">
        <button
          type="button"
          onClick={() => {
            track("creator_share_clicked", { source: "empty_hero" });
            onShare();
          }}
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-golden-tee px-4 py-3 text-sm font-semibold text-mowing-green hover:opacity-95"
        >
          <Share2 className="h-4 w-4" aria-hidden />
          Find your first seller
        </button>
      </div>
    </section>
  );
}
