import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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
    .select("id, listing_id, buyer_id, seller_id, amount, status, shipped_at, completed_at, created_at, listing:listings(model, category)")
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
