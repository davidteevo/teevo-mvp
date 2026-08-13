"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useWatchlist } from "@/lib/watchlist-context";
import { track } from "@/lib/analytics";
import { isWatchListingId } from "@/lib/watchlist";

export function WatchIntentHandler() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { ready, consumeWatchIntent } = useWatchlist();

  useEffect(() => {
    if (loading || !ready) return;
    const src = searchParams.get("src");
    if (src === "watchlist_reminder") track("watchlist_reminder_clicked", { path: pathname });
    if (src === "watchlist_price_drop") track("watchlist_price_drop_clicked", { path: pathname });
  }, [loading, pathname, ready, searchParams]);

  useEffect(() => {
    if (loading || !ready || !user) return;
    const watch = searchParams.get("watch");
    if (!isWatchListingId(watch)) return;

    let cancelled = false;
    consumeWatchIntent(watch).finally(() => {
      if (cancelled) return;
      const params = new URLSearchParams(searchParams.toString());
      params.delete("watch");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });

    return () => {
      cancelled = true;
    };
  }, [consumeWatchIntent, loading, pathname, ready, router, searchParams, user]);

  return null;
}
