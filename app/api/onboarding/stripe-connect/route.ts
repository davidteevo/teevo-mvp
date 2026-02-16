import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const returnUrl = body.returnUrl ?? `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard`;
  const refreshUrl = body.refreshUrl ?? `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard`;

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: profile } = await admin.from("users").select("stripe_account_id, role").eq("id", user.id).single();

  let accountId = profile?.stripe_account_id;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "GB",
      email: user.email ?? undefined,
    });
    accountId = account.id;
    const updated_at = new Date().toISOString();
    await admin
      .from("users")
      .update({
        stripe_account_id: accountId,
        updated_at,
        ...(profile?.role !== "admin" ? { role: "seller" } : {}),
      })
      .eq("id", user.id);
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    return_url: returnUrl,
    refresh_url: refreshUrl,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: link.url });
}
