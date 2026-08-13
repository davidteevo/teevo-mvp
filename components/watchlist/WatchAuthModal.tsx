"use client";

import Link from "next/link";
import { useWatchlist } from "@/lib/watchlist-context";
import { watchRedirectPath } from "@/lib/watchlist";

export function WatchAuthModal() {
  const { authListingId, authReturnPath, closeAuth } = useWatchlist();
  if (!authListingId) return null;

  const redirect = watchRedirectPath(authListingId, authReturnPath);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={closeAuth}
      role="dialog"
      aria-modal="true"
      aria-labelledby="watchlist-auth-title"
    >
      <div
        className="rounded-2xl bg-white shadow-xl max-w-md w-full p-6 text-mowing-green"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="watchlist-auth-title" className="text-xl font-bold mb-2">
          Save this club to your Watchlist
        </h2>
        <p className="text-mowing-green/80 text-sm mb-5">
          Create a free Teevo account or sign in to keep track of clubs you&apos;re interested in.
        </p>
        <div className="space-y-2">
          <Link
            href={`/signup?redirect=${encodeURIComponent(redirect)}`}
            className="block w-full rounded-xl bg-mowing-green text-off-white-pique px-4 py-3 text-center font-semibold hover:opacity-90"
            onClick={closeAuth}
          >
            Create account
          </Link>
          <Link
            href={`/login?redirect=${encodeURIComponent(redirect)}`}
            className="block w-full rounded-xl border-2 border-mowing-green text-mowing-green px-4 py-3 text-center font-semibold hover:bg-mowing-green/10"
            onClick={closeAuth}
          >
            Sign in
          </Link>
        </div>
        <button
          type="button"
          onClick={closeAuth}
          className="mt-4 w-full text-sm text-mowing-green/70 hover:text-mowing-green"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
