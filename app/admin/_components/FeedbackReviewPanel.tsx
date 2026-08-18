"use client";

import Link from "next/link";
import { AdminFeedbackActions } from "@/app/admin/feedback/[id]/AdminFeedbackActions";
import type { FeedbackReviewDetail } from "@/lib/admin-action-centre-data";

export function FeedbackReviewPanel({
  detail,
  onSuccess,
  onAlreadyProcessed,
}: {
  detail: FeedbackReviewDetail;
  onSuccess: (message: string) => void;
  onAlreadyProcessed: () => void;
}) {
  const review = detail.review as {
    id: string;
    status: string;
    rating: number;
    review_text?: string | null;
    listing_title_snapshot?: string;
    buyer_name?: string;
    seller_name?: string;
    transaction_id?: string;
    requires_admin_action?: boolean;
    moderation_reason?: string | null;
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-mowing-green">{review.listing_title_snapshot || "Feedback"}</h3>
        <p className="text-sm text-mowing-green/80">
          {"★".repeat(review.rating)}
          {"☆".repeat(5 - review.rating)}
        </p>
      </div>
      <dl className="space-y-1 text-sm text-mowing-green">
        <p>
          <span className="font-medium">Buyer:</span> {review.buyer_name ?? "—"}
        </p>
        <p>
          <span className="font-medium">Seller:</span> {review.seller_name ?? "—"}
        </p>
        {review.transaction_id && (
          <p>
            <span className="font-medium">Order:</span>{" "}
            <Link href={`/admin/transactions/${review.transaction_id}`} className="text-par-3-punch hover:underline">
              #{review.transaction_id.slice(0, 8)}
            </Link>
          </p>
        )}
      </dl>
      {review.review_text && (
        <p className="text-sm text-mowing-green/90 whitespace-pre-wrap rounded-lg bg-mowing-green/5 p-3">
          {review.review_text}
        </p>
      )}
      {detail.reports.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-mowing-green/70">Why it needs review</p>
          <ul className="mt-1 space-y-1 text-sm text-mowing-green">
            {detail.reports.map((raw) => {
              const report = raw as { id: string; reason_label?: string; details?: string | null; status?: string };
              return (
                <li key={report.id}>
                  {report.reason_label ?? "Report"}
                  {report.details ? ` — ${report.details}` : ""}
                  {report.status === "open" ? " (open)" : ""}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <AdminFeedbackActions
        reviewId={review.id}
        status={review.status}
        onSuccess={(alreadyProcessed) => {
          if (alreadyProcessed) onAlreadyProcessed();
          else onSuccess("Feedback moderated ✓");
        }}
      />
    </div>
  );
}
