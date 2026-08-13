"use client";

import { Heart } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useWatchlist, type WatchSource } from "@/lib/watchlist-context";

export function WatchButton({
  listingId,
  sellerId,
  brand,
  model,
  category,
  price,
  source = "listing",
  compact = false,
}: {
  listingId: string;
  sellerId: string;
  brand?: string | null;
  model?: string | null;
  category?: string | null;
  price?: number | null;
  source?: WatchSource;
  compact?: boolean;
}) {
  const { user, loading: authLoading } = useAuth();
  const { isWatched, toggle, promptAuth } = useWatchlist();

  const isOwnListing = !!(user?.id && sellerId && user.id === sellerId);
  if (authLoading) return null;

  if (isOwnListing) {
    return (
      <span
        className={
          compact
            ? "pointer-events-none inline-flex items-center rounded-full bg-mowing-green px-2 py-1 text-[11px] font-semibold text-off-white-pique shadow-sm"
            : "pointer-events-none inline-flex items-center justify-center rounded-xl bg-mowing-green px-4 py-2.5 text-sm font-semibold text-off-white-pique"
        }
      >
        Your listing
      </span>
    );
  }

  const watching = !!user && isWatched(listingId);
  const meta = {
    brand,
    model,
    category,
    listing_price: price ?? undefined,
    source,
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      promptAuth(listingId, typeof window !== "undefined" ? window.location.pathname + window.location.search : null, meta);
      return;
    }
    void toggle(listingId, meta);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={watching}
      aria-label={watching ? "Watching" : "Watch"}
      className={
        compact
          ? `inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold shadow-sm backdrop-blur-sm ${
              watching
                ? "bg-white/95 text-divot-pink"
                : "bg-white/90 text-mowing-green hover:bg-white"
            }`
          : `inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold border ${
              watching
                ? "border-divot-pink/40 bg-divot-pink/10 text-divot-pink"
                : "border-mowing-green/30 bg-white text-mowing-green hover:bg-mowing-green/5"
            }`
      }
    >
      <Heart className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} fill={watching ? "currentColor" : "none"} />
      {watching ? "Watching" : "Watch"}
    </button>
  );
}
