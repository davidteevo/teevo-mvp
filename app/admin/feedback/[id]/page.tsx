import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { REVIEW_REPORT_REASON_LABELS } from "@/lib/seller-reviews";
import { AdminFeedbackActions } from "./AdminFeedbackActions";
import { formatReviewDate } from "@/lib/seller-reviews";

export const dynamic = "force-dynamic";

export default async function AdminFeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: review } = await admin.from("seller_reviews").select("*").eq("id", id).maybeSingle();
  if (!review) notFound();

  const [{ data: reports }, { data: events }, { data: users }] = await Promise.all([
    admin
      .from("seller_review_reports")
      .select("*")
      .eq("review_id", id)
      .order("created_at", { ascending: false }),
    admin
      .from("seller_review_moderation_events")
      .select("*")
      .eq("review_id", id)
      .order("created_at", { ascending: false }),
    admin
      .from("users")
      .select("id, display_name, email")
      .in("id", [review.buyer_id, review.seller_id, review.moderated_by].filter(Boolean)),
  ]);

  const names = new Map<string, string>();
  for (const u of users ?? []) {
    names.set(u.id, u.display_name?.trim() || u.email || u.id.slice(0, 8));
  }
  const reporterIds = Array.from(new Set((reports ?? []).map((r) => r.reporter_id).filter(Boolean)));
  if (reporterIds.length) {
    const { data: reporters } = await admin
      .from("users")
      .select("id, display_name, email")
      .in("id", reporterIds);
    for (const u of reporters ?? []) {
      names.set(u.id, u.display_name?.trim() || u.email || u.id.slice(0, 8));
    }
  }

  return (
    <div>
      <Link href="/admin/feedback" className="text-sm text-mowing-green/80 hover:text-mowing-green font-medium">
        ← Back to feedback
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-mowing-green">Review {review.id.slice(0, 8)}…</h1>
      <p className="mt-1 text-mowing-green/70">
        {review.requires_admin_action ? "Requires Admin action" : "No open Admin action"} · {review.status}
      </p>

      <div className="mt-6 rounded-xl border border-par-3-punch/20 bg-white p-6 space-y-3 text-sm text-mowing-green">
        <p>
          <span className="font-medium">Rating:</span> {"★".repeat(review.rating)}
          {"☆".repeat(5 - review.rating)}
        </p>
        <p>
          <span className="font-medium">Seller:</span>{" "}
          <Link href={`/seller/${review.seller_id}`} className="text-par-3-punch hover:underline">
            {names.get(review.seller_id)}
          </Link>
        </p>
        <p>
          <span className="font-medium">Buyer:</span> {names.get(review.buyer_id)}
        </p>
        <p>
          <span className="font-medium">Product:</span> {review.listing_title_snapshot}
        </p>
        <p>
          <span className="font-medium">Order:</span>{" "}
          <Link href={`/admin/transactions?id=${review.transaction_id}`} className="text-par-3-punch hover:underline">
            {review.transaction_id.slice(0, 8)}…
          </Link>
        </p>
        <p>
          <span className="font-medium">Date:</span> {formatReviewDate(review.created_at)}
        </p>
        {review.review_text && (
          <p className="whitespace-pre-wrap border-t border-par-3-punch/10 pt-3">{review.review_text}</p>
        )}
        {review.moderation_reason && (
          <p className="text-mowing-green/70">
            Last moderation: {review.moderation_reason}
            {review.moderated_by ? ` · ${names.get(review.moderated_by)}` : ""}
            {review.moderated_at ? ` · ${formatReviewDate(review.moderated_at)}` : ""}
          </p>
        )}
      </div>

      <AdminFeedbackActions reviewId={review.id} status={review.status} />

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-mowing-green mb-3">Reports</h2>
        {(reports ?? []).length === 0 ? (
          <p className="text-sm text-mowing-green/70">No reports.</p>
        ) : (
          <ul className="space-y-3">
            {(reports ?? []).map((r) => (
              <li key={r.id} className="rounded-xl border border-par-3-punch/20 bg-white p-4 text-sm">
                <p className="font-medium text-mowing-green">
                  {REVIEW_REPORT_REASON_LABELS[r.reason as keyof typeof REVIEW_REPORT_REASON_LABELS] ??
                    r.reason}{" "}
                  · {r.status}
                </p>
                <p className="text-mowing-green/70 mt-1">
                  {r.reporter_id ? names.get(r.reporter_id) : "Unknown"} · {formatReviewDate(r.created_at)}
                </p>
                {r.details && <p className="mt-2 text-mowing-green/80">{r.details}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-mowing-green mb-3">Moderation history</h2>
        {(events ?? []).length === 0 ? (
          <p className="text-sm text-mowing-green/70">No moderation actions yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {(events ?? []).map((e) => (
              <li key={e.id} className="rounded-lg border border-par-3-punch/20 bg-white p-3">
                <span className="font-medium text-mowing-green">{e.action}</span>
                {e.previous_status && e.new_status ? ` · ${e.previous_status} → ${e.new_status}` : ""}
                {e.reason ? ` · ${e.reason}` : ""}
                <span className="text-mowing-green/60"> · {formatReviewDate(e.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
