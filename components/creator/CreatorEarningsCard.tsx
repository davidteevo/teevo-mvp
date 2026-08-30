"use client";

import Link from "next/link";
import { formatPoundsCompact } from "@/components/creator/utils";
import type {
  CreatorHubActivityItem,
  CreatorHubPersonalBest,
} from "@/lib/creator/hub";
import { ReferralRewardType } from "@/lib/referral/types";
import { track } from "@/lib/analytics";

type Props = {
  earnedPence: number;
  pendingPence: number;
  opportunityPence: number;
  recentRewards: CreatorHubActivityItem[];
  personalBest?: CreatorHubPersonalBest;
  id?: string;
};

function isRewardItem(item: CreatorHubActivityItem): boolean {
  return (
    item.type === ReferralRewardType.CREATOR_NEW_USER_REWARD ||
    item.type === ReferralRewardType.CREATOR_LISTING_REWARD ||
    item.type === ReferralRewardType.CREATOR_TRANSACTION_REWARD
  );
}

export function CreatorEarningsCard({
  earnedPence,
  pendingPence,
  opportunityPence,
  recentRewards,
  personalBest,
  id,
}: Props) {
  const rewards = recentRewards.filter(isRewardItem).slice(0, 3);

  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="text-lg font-bold text-mowing-green">
        Your Teevo credit <span aria-hidden>💰</span>
      </h2>

      {earnedPence === 0 && pendingPence === 0 && opportunityPence === 0 && rewards.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-par-3-punch/30 bg-white p-4">
          <p className="font-semibold text-mowing-green">Your first reward is waiting.</p>
          <p className="mt-1 text-sm text-mowing-green/70">
            Earn Teevo credit when one of your referrals completes a qualifying action.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-par-3-punch/15 bg-white p-3">
              <p className="text-2xl font-bold text-mowing-green">
                {formatPoundsCompact(earnedPence)}
              </p>
              <p className="mt-0.5 text-xs text-mowing-green/70">earned all time</p>
            </div>
            <div className="rounded-xl border border-par-3-punch/15 bg-white p-3">
              <p className="text-2xl font-bold text-mowing-green">
                {formatPoundsCompact(opportunityPence)}
              </p>
              <p className="mt-0.5 text-xs text-mowing-green/70">still available</p>
            </div>
          </div>

          {pendingPence > 0 && (
            <p className="mt-2 text-sm font-medium text-mowing-green">
              <span className="rounded-full bg-golden-tee/40 px-2 py-0.5 font-semibold">
                {formatPoundsCompact(pendingPence)} Teevo credit pending
              </span>
            </p>
          )}

          {personalBest && (
            <p className="mt-2 text-sm text-mowing-green/80">
              <span aria-hidden>{personalBest.emoji} </span>
              <strong>{personalBest.title}</strong> — {personalBest.body}
            </p>
          )}

          {rewards.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-mowing-green/55">
                Recent rewards
              </p>
              <ul className="mt-1.5 space-y-1.5">
                {rewards.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-2 text-sm text-mowing-green"
                  >
                    <span className="min-w-0 truncate">{r.title}</span>
                    <span className="shrink-0 font-semibold text-par-3-punch">
                      +{formatPoundsCompact(r.amountPence)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <Link
        href="/dashboard/creator/activity"
        onClick={() => track("creator_earnings_viewed", {})}
        className="mt-3 inline-block text-sm font-semibold text-par-3-punch hover:underline"
      >
        View reward history →
      </Link>
    </section>
  );
}
