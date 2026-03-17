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
    // #region agent log
    fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d1a7bb" },
      body: JSON.stringify({
        sessionId: "d1a7bb",
        runId: "repro-1",
        location: "app/auth/callback/route.ts:exchangeResult",
        message: "auth callback exchangeCodeForSession result",
        data: {
          hasError: !!exchangeError,
          isResetPasswordNext: next === "/login/reset-password" || next.startsWith("/login/reset-password"),
        },
        timestamp: Date.now(),
        hypothesisId: "C1",
      }),
    }).catch(() => {});
    // #endregion
    if (exchangeError) {
      const base = new URL(request.url).origin;
      const isResetPassword = next === "/login/reset-password" || next.startsWith("/login/reset-password");
      const redirectPath = isResetPassword
        ? `${base}/login/reset-password?error=invalid_link`
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
