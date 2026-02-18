import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = await createServiceClient();
  const { data: existing } = await supabaseAdmin.from("users").select("id").eq("id", user.id).single();
  const updated_at = new Date().toISOString();

  if (existing) {
    const { error } = await supabaseAdmin
      .from("users")
      .update({ email: user.email ?? "", updated_at })
      .eq("id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, isNewUser: false });
  }

  let stripe_account_id: string | null = null;
  try {
    const account = await stripe.accounts.create({
      type: "express",
      country: "GB",
      business_type: "individual",
      email: user.email ?? undefined,
    });
    stripe_account_id = account.id;
  } catch {
    // Create on first Connect click if Stripe fails (e.g. rate limit)
  }

  const { error } = await supabaseAdmin.from("users").insert({
    id: user.id,
    email: user.email ?? "",
    role: "seller",
    stripe_account_id,
    updated_at,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, isNewUser: true });
}

async function createServiceClient() {
  const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
