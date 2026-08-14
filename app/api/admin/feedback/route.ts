import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { admin, user };
}

/**
 * GET /api/admin/feedback
 * Query: q, seller, buyer, rating, status, transaction, reported, requires_action, from, to
 */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const seller = searchParams.get("seller")?.trim() || "";
  const buyer = searchParams.get("buyer")?.trim() || "";
  const rating = searchParams.get("rating");
  const status = searchParams.get("status");
  const transaction = searchParams.get("transaction")?.trim() || "";
  const reported = searchParams.get("reported");
  const requiresAction = searchParams.get("requires_action");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = auth.admin
    .from("seller_reviews")
    .select(
      "id, transaction_id, listing_id, buyer_id, seller_id, rating, review_text, listing_title_snapshot, status, requires_admin_action, created_at, moderated_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (status && ["active", "hidden", "removed"].includes(status)) {
    query = query.eq("status", status);
  }
  if (rating && ["1", "2", "3", "4", "5"].includes(rating)) {
    query = query.eq("rating", Number(rating));
  }
  if (transaction) {
    query = query.eq("transaction_id", transaction);
  }
  if (seller) {
    query = query.eq("seller_id", seller);
  }
  if (buyer) {
    query = query.eq("buyer_id", buyer);
  }
  if (requiresAction === "1" || requiresAction === "true") {
    query = query.eq("requires_admin_action", true);
  }
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let rows = data ?? [];
  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter((r) => {
      return (
        r.id.toLowerCase().includes(needle) ||
        r.transaction_id.toLowerCase().includes(needle) ||
        (r.listing_title_snapshot || "").toLowerCase().includes(needle) ||
        (r.review_text || "").toLowerCase().includes(needle)
      );
    });
  }

  const ids = rows.map((r) => r.id);
  const reportCounts = new Map<string, number>();
  if (ids.length) {
    const { data: reports } = await auth.admin
      .from("seller_review_reports")
      .select("review_id")
      .in("review_id", ids);
    for (const r of reports ?? []) {
      reportCounts.set(r.review_id, (reportCounts.get(r.review_id) ?? 0) + 1);
    }
  }

  if (reported === "1" || reported === "true") {
    rows = rows.filter((r) => (reportCounts.get(r.id) ?? 0) > 0);
  }

  const userIds = Array.from(new Set(rows.flatMap((r) => [r.buyer_id, r.seller_id])));
  const nameMap = new Map<string, string>();
  if (userIds.length) {
    const { data: users } = await auth.admin
      .from("users")
      .select("id, display_name, email")
      .in("id", userIds);
    for (const u of users ?? []) {
      nameMap.set(u.id, u.display_name?.trim() || u.email || u.id.slice(0, 8));
    }
  }

  return NextResponse.json({
    reviews: rows.map((r) => ({
      ...r,
      report_count: reportCounts.get(r.id) ?? 0,
      buyer_name: nameMap.get(r.buyer_id) ?? r.buyer_id.slice(0, 8),
      seller_name: nameMap.get(r.seller_id) ?? r.seller_id.slice(0, 8),
    })),
  });
}
