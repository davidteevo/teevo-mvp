"use client";

import { useCallback, useEffect, useState } from "react";
import { ReviewCard, type PublicReview } from "@/components/reviews/ReviewCard";
import { track } from "@/lib/analytics";
import { FEEDBACK_EVENTS } from "@/lib/seller-reviews";

export function SellerReviewsList({ sellerId }: { sellerId: string }) {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (next?: string | null) => {
      setLoading(true);
      setError(null);
      const qs = next ? `?cursor=${encodeURIComponent(next)}` : "";
      const res = await fetch(`/api/sellers/${sellerId}/reviews${qs}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load reviews");
        setLoading(false);
        return;
      }
      const page = (data.reviews ?? []) as PublicReview[];
      setReviews((prev) => (next ? [...prev, ...page] : page));
      setCursor(data.next_cursor ?? null);
      setHasMore(!!data.next_cursor);
      setLoading(false);
      if (!next) {
        track(FEEDBACK_EVENTS.VIEWED, { seller_id: sellerId, count: page.length });
      }
    },
    [sellerId]
  );

  useEffect(() => {
    load(null).catch(() => setError("Could not load reviews"));
  }, [load]);

  if (loading && reviews.length === 0) {
    return <p className="text-mowing-green/70">Loading reviews…</p>;
  }
  if (error && reviews.length === 0) {
    return <p className="text-divot-pink">{error}</p>;
  }
  if (reviews.length === 0) {
    return <p className="text-mowing-green/70">No feedback yet.</p>;
  }

  return (
    <div className="space-y-4">
      {reviews.map((r) => (
        <ReviewCard key={r.id} review={r} />
      ))}
      {hasMore && (
        <button
          type="button"
          onClick={() => load(cursor)}
          disabled={loading}
          className="w-full rounded-lg border border-mowing-green/40 text-mowing-green py-2 text-sm font-medium hover:bg-mowing-green/10"
        >
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
