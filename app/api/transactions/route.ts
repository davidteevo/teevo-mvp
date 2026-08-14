import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { isFreeStarterPackEnabled } from "@/lib/starter-pack";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role"); // buyer | seller

  // Use admin client so the join to listings returns data for sold listings (RLS otherwise blocks buyers from reading sold listings).
  const admin = createAdminClient();
  let query = admin
    .from("transactions")
    .select(
      "id, listing_id, buyer_id, seller_id, amount, status, order_state, shipped_at, completed_at, buyer_confirmed_at, delivery_issue_reported_at, created_at, shippo_label_url, shippo_qr_code_url, shippo_tracking_number, fulfilment_status, fulfilment_mode, courier, tracking_number, tracking_url, shipping_label_url, shipping_package, box_fee_gbp, box_type, shipping_service, shipping_fee_gbp, packaging_photos, packaging_status, packaging_review_notes, review_notes, reviewed_by, reviewed_at, packaging_source, packaging_requested_at, starter_pack_dispatched_at, starter_pack_admin_notified_at, starter_pack_courier, starter_pack_tracking_number, starter_pack_tracking_url, listing:listings(model, category, brand, title, listing_images(storage_path, sort_order))"
    )
    .order("created_at", { ascending: false });

  if (role === "buyer") {
    query = query.eq("buyer_id", user.id);
  } else if (role === "seller") {
    query = query.eq("seller_id", user.id);
  } else {
    query = query.or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);
  }

  const [{ data, error }, freeStarterPackEnabled] = await Promise.all([
    query,
    role === "seller" ? isFreeStarterPackEnabled(admin) : Promise.resolve(false),
  ]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const transactions = data ?? [];
  const txIds = transactions.map((t) => t.id);
  const reviewByTx = new Map<string, string>();
  if (txIds.length) {
    const { data: reviews } = await admin
      .from("seller_reviews")
      .select("id, transaction_id")
      .in("transaction_id", txIds);
    for (const r of reviews ?? []) {
      reviewByTx.set(r.transaction_id, r.id);
    }
  }

  return NextResponse.json({
    transactions: transactions.map((t) => ({
      ...t,
      seller_review_id: reviewByTx.get(t.id) ?? null,
    })),
    ...(role === "seller" ? { free_starter_pack_enabled: freeStarterPackEnabled } : {}),
  });
}
