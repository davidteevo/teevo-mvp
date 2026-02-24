import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

  let query = supabase
    .from("transactions")
    .select(
      "id, listing_id, buyer_id, seller_id, amount, status, shipped_at, completed_at, created_at, shippo_label_url, shippo_qr_code_url, shippo_tracking_number, fulfilment_status, shipping_package, box_fee_gbp, box_type, shipping_service, shipping_fee_gbp, packaging_photos, packaging_status, packaging_review_notes, review_notes, reviewed_by, reviewed_at, listing:listings(model, category, brand, listing_images(storage_path, sort_order))"
    )
    .order("created_at", { ascending: false });

  if (role === "buyer") {
    query = query.eq("buyer_id", user.id);
  } else if (role === "seller") {
    query = query.eq("seller_id", user.id);
  } else {
    query = query.or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ transactions: data ?? [] });
}
