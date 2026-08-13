"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/lib/auth-context";
import { track } from "@/lib/analytics";

export type WatchSource = "card" | "listing" | "watchlist" | "intent";

type WatchMeta = {
  brand?: string | null;
  model?: string | null;
  category?: string | null;
  listing_price?: number | null;
  source?: WatchSource;
};

type WatchlistContextValue = {
  ready: boolean;
  watchedIds: Set<string>;
  isWatched: (listingId: string) => boolean;
  toggle: (listingId: string, meta?: WatchMeta) => Promise<boolean>;
  promptAuth: (listingId: string, returnPath?: string | null, meta?: WatchMeta) => void;
  authListingId: string | null;
  authReturnPath: string | null;
  closeAuth: () => void;
  consumeWatchIntent: (listingId: string) => Promise<boolean>;
  toast: string | null;
};

const WatchlistContext = createContext<WatchlistContextValue | undefined>(undefined);

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [authListingId, setAuthListingId] = useState<string | null>(null);
  const [authReturnPath, setAuthReturnPath] = useState<string | null>(null);
  const inFlight = useRef<Set<string>>(new Set());
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const loadIds = useCallback(async () => {
    if (!user) {
      setIds(new Set());
      setReady(true);
      return;
    }
    setReady(false);
    try {
      const res = await fetch("/api/watchlist/ids", { credentials: "include" });
      if (!res.ok) {
        setIds(new Set());
        setReady(true);
        return;
      }
      const data = await res.json().catch(() => ({}));
      const next = Array.isArray(data.ids) ? data.ids.filter((id: unknown) => typeof id === "string") : [];
      setIds(new Set(next));
    } catch {
      setIds(new Set());
    } finally {
      setReady(true);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    loadIds();
  }, [authLoading, loadIds]);

  const isWatched = useCallback((listingId: string) => ids.has(listingId), [ids]);

  const toggle = useCallback(
    async (listingId: string, meta?: WatchMeta): Promise<boolean> => {
      if (!user) return false;
      if (inFlight.current.has(listingId)) return false;
      inFlight.current.add(listingId);

      const currentlyWatched = ids.has(listingId);
      setIds((prev) => {
        const next = new Set(prev);
        if (currentlyWatched) next.delete(listingId);
        else next.add(listingId);
        return next;
      });

      try {
        const res = currentlyWatched
          ? await fetch(`/api/watchlist/${listingId}`, { method: "DELETE", credentials: "include" })
          : await fetch("/api/watchlist", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ listingId }),
            });
        if (!res.ok) {
          setIds((prev) => {
            const next = new Set(prev);
            if (currentlyWatched) next.add(listingId);
            else next.delete(listingId);
            return next;
          });
          showToast("Couldn't update your Watchlist. Please try again.");
          return false;
        }
        const properties = {
          listing_id: listingId,
          brand: meta?.brand ?? undefined,
          model: meta?.model ?? undefined,
          club_type: meta?.category ?? undefined,
          listing_price: meta?.listing_price ?? undefined,
          source: meta?.source ?? "listing",
        };
        if (currentlyWatched) {
          track("watchlist_removed", properties);
        } else {
          track("watchlist_added", properties);
          showToast("Added to your Watchlist");
        }
        return true;
      } catch {
        setIds((prev) => {
          const next = new Set(prev);
          if (currentlyWatched) next.add(listingId);
          else next.delete(listingId);
          return next;
        });
        showToast("Couldn't update your Watchlist. Please try again.");
        return false;
      } finally {
        inFlight.current.delete(listingId);
      }
    },
    [ids, showToast, user]
  );

  const promptAuth = useCallback((listingId: string, returnPath?: string | null, meta?: WatchMeta) => {
    setAuthListingId(listingId);
    setAuthReturnPath(returnPath ?? (typeof window !== "undefined" ? window.location.pathname + window.location.search : null));
    track("watchlist_auth_prompt_shown", {
      listing_id: listingId,
      brand: meta?.brand ?? undefined,
      model: meta?.model ?? undefined,
      club_type: meta?.category ?? undefined,
      listing_price: meta?.listing_price ?? undefined,
      source: meta?.source ?? "listing",
    });
  }, []);

  const closeAuth = useCallback(() => {
    setAuthListingId(null);
    setAuthReturnPath(null);
  }, []);

  const consumeWatchIntent = useCallback(
    async (listingId: string): Promise<boolean> => {
      if (!user) return false;
      if (ids.has(listingId)) return true;
      if (inFlight.current.has(listingId)) return false;
      inFlight.current.add(listingId);
      setIds((prev) => new Set(prev).add(listingId));
      try {
        const res = await fetch("/api/watchlist", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId }),
        });
        if (!res.ok) {
          setIds((prev) => {
            const next = new Set(prev);
            next.delete(listingId);
            return next;
          });
          return false;
        }
        track("watchlist_added", { listing_id: listingId, source: "intent" });
        showToast("Added to your Watchlist");
        return true;
      } catch {
        setIds((prev) => {
          const next = new Set(prev);
          next.delete(listingId);
          return next;
        });
        return false;
      } finally {
        inFlight.current.delete(listingId);
      }
    },
    [ids, showToast, user]
  );

  const value = useMemo<WatchlistContextValue>(
    () => ({
      ready,
      watchedIds: ids,
      isWatched,
      toggle,
      promptAuth,
      authListingId,
      authReturnPath,
      closeAuth,
      consumeWatchIntent,
      toast,
    }),
    [
      authListingId,
      authReturnPath,
      closeAuth,
      consumeWatchIntent,
      ids,
      isWatched,
      promptAuth,
      ready,
      toast,
      toggle,
    ]
  );

  return (
    <WatchlistContext.Provider value={value}>
      {children}
      {toast && (
        <div
          className="fixed bottom-4 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-mowing-green px-4 py-2 text-sm font-medium text-off-white-pique shadow-lg"
          role="status"
        >
          {toast}
        </div>
      )}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist(): WatchlistContextValue {
  const ctx = useContext(WatchlistContext);
  if (!ctx) {
    throw new Error("useWatchlist must be used within WatchlistProvider");
  }
  return ctx;
}
