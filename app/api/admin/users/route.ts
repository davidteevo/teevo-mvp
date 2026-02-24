import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
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

  // Sync auth.users → public.users so the list includes everyone who has signed up
  const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const now = new Date().toISOString();
  for (const authUser of authUsers?.users ?? []) {
    const id = authUser.id;
    const email = authUser.email ?? "";
    const { data: existing } = await admin.from("users").select("id").eq("id", id).single();
    if (existing) {
      await admin.from("users").update({ email, updated_at: now }).eq("id", id);
    } else {
      await admin.from("users").insert({ id, email, role: "buyer", updated_at: now });
    }
  }

  const { data, error } = await admin
    .from("users")
    .select("id, email, role, stripe_account_id, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ users: data ?? [] });
}
