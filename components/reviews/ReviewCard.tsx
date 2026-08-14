"use client";

import { useState } from "react";
import { StarRating } from "@/components/reviews/StarRating";
import { ReportReviewModal } from "@/components/reviews/ReportReviewModal";
import { formatReviewDate } from "@/lib/seller-reviews";

export type PublicReview = {
  id: string;
  rating: number;
  review_text: string | null;
  listing_title: string;
  listing_id: string;
  created_at: string;
  verified_purchase: boolean;
};

export function ReviewCard({ review }: { review: PublicReview }) {
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <article
      id={`review-${review.id}`}
      className="rounded-xl border border-par-3-punch/20 bg-white p-4 sm:p-5"
    >
      <StarRating value={review.rating} readOnly size="sm" />
      {review.review_text && (
        <p className="mt-3 text-mowing-green/90 whitespace-pre-wrap">{review.review_text}</p>
      )}
      <p className="mt-3 text-xs font-medium text-par-3-punch">✓ Verified purchase</p>
      <p className="mt-1 text-sm text-mowing-green/80">{review.listing_title}</p>
      <p className="mt-1 text-xs text-mowing-green/50">{formatReviewDate(review.created_at)}</p>
      <button
        type="button"
        onClick={() => setReportOpen(true)}
        className="mt-3 text-xs text-mowing-green/60 hover:text-mowing-green hover:underline"
      >
        Report review
      </button>
      {reportOpen && (
        <ReportReviewModal reviewId={review.id} onClose={() => setReportOpen(false)} />
      )}
    </article>
  );
}
