"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ListingCard } from "@/components/listing/ListingCard";
import { similarClubsPath } from "@/lib/watchlist";
import type { Listing } from "@/types/database";

type WatchlistApiItem = {
  id: string;
  listing_id: string;
  created_at: string;
  listing: Listing & { archived_at?: string | null };
};

function unavailableLabel(listing: Listing & { archived_at?: string | null }): string | null {
  if (listing.status === "sold") return "Sold";
  if (listing.status === "rejected" || listing.archived_at) return "No longer available";
  return null;
}

export default function WatchlistPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<WatchlistApiItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent("/watchlist")}`);
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/watchlist", { credentials: "include" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Failed to load Watchlist");
        setItems(Array.isArray(data.items) ? data.items : []);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load Watchlist");
        setItems([]);
      });
  }, [user]);

  if (loading || !user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center text-mowing-green/80">
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-mowing-green">Watchlist</h1>
      <p className="mt-1 text-mowing-green/80">Clubs you&apos;re keeping an eye on.</p>

      {error && (
        <p className="mt-4 text-sm text-divot-pink" role="alert">
          {error}
        </p>
      )}

      {items == null ? (
        <p className="mt-8 text-mowing-green/70">Loading your Watchlist…</p>
      ) : items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-par-3-punch/20 bg-white p-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-mowing-green/10">
            <Heart className="h-6 w-6 text-mowing-green" />
          </div>
          <h2 className="text-xl font-bold text-mowing-green">Nothing on your Watchlist yet</h2>
          <p className="mt-2 text-mowing-green/80">
            Found a club you like? Tap the heart to keep an eye on it.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-xl bg-mowing-green text-off-white-pique px-5 py-2.5 text-sm font-semibold hover:opacity-90"
          >
            Browse clubs
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0 [&>*]:min-w-0">
          {items.map((item) => {
            const label = unavailableLabel(item.listing);
            return (
              <ListingCard
                key={item.id}
                listing={item.listing}
                source="watchlist"
                unavailableLabel={label}
                similarHref={label ? similarClubsPath(item.listing.category) : null}
                trackOpenEvent="watchlist_listing_opened"
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
