"use client";

import Link from "next/link";
import { formatRelativeTime } from "@/components/creator/utils";
import type { CreatorHubActivityItem } from "@/lib/creator/hub";
import { ReferralRewardType } from "@/lib/referral/types";

function emojiFor(type: string): string {
  if (type === ReferralRewardType.CREATOR_NEW_USER_REWARD) return "👋";
  if (type === ReferralRewardType.CREATOR_LISTING_REWARD) return "🎉";
  if (type === ReferralRewardType.CREATOR_TRANSACTION_REWARD) return "💸";
  return "✨";
}

type Props = {
  items: CreatorHubActivityItem[];
  limit?: number;
  showViewAll?: boolean;
};

export function CreatorActivityFeed({ items, limit = 5, showViewAll = true }: Props) {
  const shown = limit > 0 ? items.slice(0, limit) : items;

  return (
    <section>
      <h2 className="text-lg font-bold text-mowing-green">What&apos;s happening</h2>
      {items.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-par-3-punch/30 bg-white p-5 text-sm text-mowing-green/70">
          Activity from your creator link will show up here.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {shown.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-par-3-punch/20 bg-white px-4 py-4"
            >
              <p className="font-semibold text-mowing-green">
                <span aria-hidden>{emojiFor(item.type)} </span>
                {item.title}
              </p>
              <p className="mt-1 text-sm text-mowing-green/80">{item.body}</p>
              <p className="mt-2 text-xs text-mowing-green/60">{formatRelativeTime(item.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
      {showViewAll && items.length > limit && (
        <Link
          href="/dashboard/creator/activity"
          className="mt-4 inline-block text-sm font-semibold text-par-3-punch hover:underline"
        >
          View all activity →
        </Link>
      )}
    </section>
  );
}
