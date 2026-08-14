import { Suspense } from "react";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import FeedbackFilters from "./FeedbackFilters";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    q?: string;
    rating?: string;
    status?: string;
    requires_action?: string;
    reported?: string;
    id?: string;
  }>;
};

export default async function AdminFeedbackPage({ searchParams }: Props) {
  const params = await searchParams;
  const highlightId = params.id;
  const admin = createAdminClient();

  let query = admin
    .from("seller_reviews")
    .select(
      "id, transaction_id, listing_id, buyer_id, seller_id, rating, review_text, listing_title_snapshot, status, requires_admin_action, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (params.status && ["active", "hidden", "removed"].includes(params.status)) {
    query = query.eq("status", params.status);
  }
  if (params.rating && ["1", "2", "3", "4", "5"].includes(params.rating)) {
    query = query.eq("rating", Number(params.rating));
  }
  if (params.requires_action === "1") {
    query = query.eq("requires_admin_action", true);
  }

  const { data } = await query;
  let rows = data ?? [];

  const ids = rows.map((r) => r.id);
  const reportCounts = new Map<string, number>();
  if (ids.length) {
    const { data: reports } = await admin
      .from("seller_review_reports")
      .select("review_id")
      .in("review_id", ids);
    for (const r of reports ?? []) {
      reportCounts.set(r.review_id, (reportCounts.get(r.review_id) ?? 0) + 1);
    }
  }
  if (params.reported === "1") {
    rows = rows.filter((r) => (reportCounts.get(r.id) ?? 0) > 0);
  }
  if (params.q?.trim()) {
    const needle = params.q.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.id.toLowerCase().includes(needle) ||
        r.transaction_id.toLowerCase().includes(needle) ||
        (r.listing_title_snapshot || "").toLowerCase().includes(needle) ||
        (r.review_text || "").toLowerCase().includes(needle)
    );
  }

  const userIds = Array.from(new Set(rows.flatMap((r) => [r.buyer_id, r.seller_id])));
  const names = new Map<string, string>();
  if (userIds.length) {
    const { data: users } = await admin.from("users").select("id, display_name, email").in("id", userIds);
    for (const u of users ?? []) {
      names.set(u.id, u.display_name?.trim() || u.email || u.id.slice(0, 8));
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-mowing-green">Feedback / Reviews</h1>
      <p className="mt-1 text-mowing-green/80">Search, inspect, and moderate seller reviews.</p>
      <Suspense fallback={<div className="mt-4 h-10" />}>
        <FeedbackFilters />
      </Suspense>
      <div className="mt-6 rounded-xl border border-par-3-punch/20 bg-white overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-mowing-green/80">No feedback matches.</div>
        ) : (
          <ul className="divide-y divide-par-3-punch/10">
            {rows.map((r) => {
              const reports = reportCounts.get(r.id) ?? 0;
              return (
                <li
                  key={r.id}
                  id={`feedback-${r.id}`}
                  className={`p-4${highlightId === r.id ? " bg-par-3-punch/10 ring-2 ring-inset ring-par-3-punch" : ""}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-mowing-green">
                        {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)} · {r.listing_title_snapshot}
                      </p>
                      <p className="text-xs text-mowing-green/60 mt-0.5">
                        {r.id.slice(0, 8)}… · Buyer {names.get(r.buyer_id)} · Seller {names.get(r.seller_id)} ·{" "}
                        {r.status}
                        {r.requires_admin_action ? " · Requires action" : ""}
                        {reports > 0 ? ` · ${reports} report${reports === 1 ? "" : "s"}` : ""}
                      </p>
                      {r.review_text && (
                        <p className="mt-2 text-sm text-mowing-green/80 line-clamp-2">{r.review_text}</p>
                      )}
                    </div>
                    <Link
                      href={`/admin/feedback/${r.id}`}
                      className="rounded-lg bg-mowing-green text-off-white-pique px-3 py-2 text-sm font-medium hover:opacity-90 shrink-0"
                    >
                      Review
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
