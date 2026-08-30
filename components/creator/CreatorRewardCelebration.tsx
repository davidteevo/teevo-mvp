"use client";

import { useEffect, useState } from "react";
import { formatPoundsCompact, prefersReducedMotion } from "@/components/creator/utils";
import type { CreatorHubActivityItem } from "@/lib/creator/hub";

type Props = {
  items: CreatorHubActivityItem[];
  totalEarnedPence: number;
  onDismiss: () => void;
};

export function CreatorRewardCelebration({ items, totalEarnedPence, onDismiss }: Props) {
  const [visible, setVisible] = useState(true);
  const primary = items[0];
  const reduced = prefersReducedMotion();

  useEffect(() => {
    if (!primary) return;
    const t = window.setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, reduced ? 4000 : 5500);
    return () => window.clearTimeout(t);
  }, [onDismiss, primary, reduced]);

  if (!primary || !visible) return null;

  const amount = items.reduce((s, i) => s + i.amountPence, 0);

  return (
    <div
      role="status"
      className={`rounded-2xl border border-par-3-punch/30 bg-par-3-punch/15 px-5 py-5 ${
        reduced ? "" : "animate-fade-in"
      }`}
    >
      <p className="text-3xl font-bold text-mowing-green">
        +{formatPoundsCompact(amount)} <span aria-hidden>🎉</span>
      </p>
      <p className="mt-2 text-base font-semibold text-mowing-green">
        {items.length > 1
          ? `${items.length} new rewards!`
          : primary.body.includes("listing")
            ? "Another golfer just listed!"
            : primary.title}
      </p>
      <p className="mt-1 text-sm text-mowing-green/80">{primary.body}</p>
      <p className="mt-3 text-sm font-medium text-mowing-green">
        {formatPoundsCompact(totalEarnedPence)} Teevo credit total
      </p>
      <button
        type="button"
        onClick={() => {
          setVisible(false);
          onDismiss();
        }}
        className="mt-3 text-sm font-medium text-par-3-punch hover:underline"
      >
        Nice
      </button>
    </div>
  );
}
