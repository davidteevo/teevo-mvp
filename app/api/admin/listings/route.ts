import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const status = searchParams.get("status")?.trim() || "";

  let query = admin
    .from("listings")
    .select("id, user_id, category, brand, model, condition, price, status, created_at")
    .order("created_at", { ascending: false });

  if (status && ["pending", "verified", "rejected", "sold"].includes(status)) {
    query = query.eq("status", status);
  }

  if (q) {
    query = query.or(`model.ilike.%${q}%,brand.ilike.%${q}%,description.ilike.%${q}%`);
  }

  const { data: listings, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = listings ?? [];
  const userIds = Array.from(new Set(rows.map((r: { user_id: string }) => r.user_id)));
  let emailByUserId: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: users } = await admin.from("users").select("id, email").in("id", userIds);
    emailByUserId = (users ?? []).reduce((acc: Record<string, string>, u: { id: string; email: string }) => {
      acc[u.id] = u.email;
      return acc;
    }, {});
  }

  const result = rows.map((r: { user_id: string; [k: string]: unknown }) => ({
    ...r,
    seller_email: emailByUserId[r.user_id] ?? null,
  }));

  return NextResponse.json({ listings: result });
}
