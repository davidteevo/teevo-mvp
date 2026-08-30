"use client";

import Link from "next/link";
import { formatPoundsCompact, formatRelativeTime } from "@/components/creator/utils";
import type { CreatorHubActivityItem } from "@/lib/creator/hub";
import { ReferralRewardType } from "@/lib/referral/types";
import { track } from "@/lib/analytics";

function emojiFor(type: string): string {
  if (type === "creator_join" || type === ReferralRewardType.CREATOR_NEW_USER_REWARD) return "👋";
  if (type === ReferralRewardType.CREATOR_LISTING_REWARD) return "🏌️";
  if (type === ReferralRewardType.CREATOR_TRANSACTION_REWARD) return "💸";
  return "✨";
}

function dayBucket(iso: string): "today" | "yesterday" | "earlier" {
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);
  if (d >= startToday) return "today";
  if (d >= startYesterday) return "yesterday";
  return "earlier";
}

function toneClass(tone: CreatorHubActivityItem["tone"]): string {
  if (tone === "earned") return "text-par-3-punch";
  if (tone === "pending") return "text-[#B8860B]";
  return "text-mowing-green";
}

type Props = {
  items: CreatorHubActivityItem[];
  limit?: number;
  showViewAll?: boolean;
  id?: string;
};

export function CreatorActivityFeed({
  items,
  limit = 4,
  showViewAll = true,
  id,
}: Props) {
  const shown = limit > 0 ? items.slice(0, limit) : items;

  const groups: { key: string; label: string; items: CreatorHubActivityItem[] }[] = [];
  for (const item of shown) {
    const bucket = dayBucket(item.createdAt);
    const label =
      bucket === "today" ? "Today" : bucket === "yesterday" ? "Yesterday" : "Earlier";
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(item);
    else groups.push({ key: bucket + groups.length, label, items: [item] });
  }

  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="text-lg font-bold text-mowing-green">
        What&apos;s happening <span aria-hidden>⚡</span>
      </h2>

      {items.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-par-3-punch/30 bg-white p-4 text-sm text-mowing-green/70">
          Nothing here yet. When your referrals start joining, listing and transacting, you&apos;ll
          see it here.
        </p>
      ) : (
        <div className="mt-3 space-y-4">
          {groups.map((g) => (
            <div key={g.key}>
              <p className="text-xs font-semibold uppercase tracking-wide text-mowing-green/55">
                {g.label}
              </p>
              <ul className="mt-1.5 space-y-2">
                {g.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-par-3-punch/15 bg-white px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${toneClass(item.tone)}`}>
                        <span aria-hidden>{emojiFor(item.type)} </span>
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-mowing-green/70">{item.body}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      {item.amountPence > 0 && (
                        <p className={`text-sm font-bold ${toneClass(item.tone)}`}>
                          {item.tone === "pending" ? "" : "+"}
                          {formatPoundsCompact(item.amountPence)}
                        </p>
                      )}
                      <p className="text-[11px] text-mowing-green/50">
                        {formatRelativeTime(item.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {showViewAll && items.length > limit && (
        <Link
          href="/dashboard/creator/activity"
          onClick={() => track("creator_activity_viewed", { count: items.length })}
          className="mt-3 inline-block text-sm font-semibold text-par-3-punch hover:underline"
        >
          View all activity →
        </Link>
      )}
    </section>
  );
}
