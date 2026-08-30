"use client";

import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import { formatPoundsCompact } from "@/components/creator/utils";
import { track } from "@/lib/analytics";

type Props = {
  onShare: () => void;
  sentinelRef: React.RefObject<HTMLElement>;
  potentialTotalPence: number;
};

export function CreatorStickyShare({
  onShare,
  sentinelRef,
  potentialTotalPence,
}: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "-80px 0px 0px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [sentinelRef]);

  const label =
    potentialTotalPence > 0
      ? `Share Teevo · Earn up to ${formatPoundsCompact(potentialTotalPence)}`
      : "Share Teevo 🚀";

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-mowing-green/15 bg-off-white-pique/95 px-4 py-3 backdrop-blur-md transition-transform duration-300 motion-reduce:transition-none lg:hidden ${
        visible ? "translate-y-0" : "translate-y-full pointer-events-none"
      }`}
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <button
        type="button"
        onClick={() => {
          track("creator_share_clicked", { source: "sticky" });
          onShare();
        }}
        className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-mowing-green px-4 py-3 text-sm font-semibold text-off-white-pique"
      >
        <Share2 className="h-4 w-4" aria-hidden />
        {label}
      </button>
    </div>
  );
}
