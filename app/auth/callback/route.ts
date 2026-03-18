import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next") ?? "/dashboard";
  const code = searchParams.get("code");
  let isNewUser = false;
  if (code) {
    const supabase = await createClient();
    const { data: { user }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      const base =
        (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "") ||
        new URL(request.url).origin;
      const isResetPassword = next === "/login/reset-password" || next.startsWith("/login/reset-password");
      const redirectPath = isResetPassword
        ? `${base}/login/reset-password?error=invalid_link&error_description=${encodeURIComponent(
            `${exchangeError.message}. For password reset, open the email link in the same browser where you clicked Forgot password (PKCE).`
          )}`
        : new URL(next, request.url).toString();
      return NextResponse.redirect(redirectPath);
    }
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
          const appUrl = process.env.NEXT_PUBLIC_APP_URL;
          const account = await stripe.accounts.create({
            type: "express",
            country: "GB",
            business_type: "individual",
            email: user.email ?? undefined,
            business_profile: {
              product_description: "Selling pre-owned golf equipment as an individual on Teevo.",
              ...(appUrl ? { url: appUrl } : {}),
            },
          });
          stripe_account_id = account.id;
        } catch {
          // Create on first Connect click if Stripe fails here (e.g. rate limit)
        }
        const first_name =
          (user.user_metadata?.first_name as string)?.trim() || null;
        await admin.from("users").insert({
          id: user.id,
          email: user.email ?? "",
          role: "seller",
          stripe_account_id,
          first_name,
          updated_at,
        });
      }
    }
  }
  const redirectPath =
    isNewUser && next === "/sell/start"
      ? "/sell/start"
      : isNewUser
        ? "/onboarding/welcome?new=1"
        : next;
  return NextResponse.redirect(new URL(redirectPath, request.url));
}
