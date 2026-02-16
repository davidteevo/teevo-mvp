import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next") ?? "/dashboard";
  const code = searchParams.get("code");
  let isNewUser = false;
  if (code) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.exchangeCodeForSession(code);
    if (user) {
      const admin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: existing } = await admin.from("users").select("id").eq("id", user.id).single();
      const updated_at = new Date().toISOString();
      if (existing) {
        await admin.from("users").update({ email: user.email ?? "", updated_at }).eq("id", user.id);
      } else {
        isNewUser = true;
        let stripe_account_id: string | null = null;
        try {
          const account = await stripe.accounts.create({
            type: "express",
            country: "GB",
            email: user.email ?? undefined,
          });
          stripe_account_id = account.id;
        } catch {
          // Create on first Connect click if Stripe fails here (e.g. rate limit)
        }
        await admin.from("users").insert({
          id: user.id,
          email: user.email ?? "",
          role: "seller",
          stripe_account_id,
          updated_at,
        });
      }
    }
  }
  const redirectPath = isNewUser ? "/onboarding/payouts?new=1" : next;
  return NextResponse.redirect(new URL(redirectPath, request.url));
}
