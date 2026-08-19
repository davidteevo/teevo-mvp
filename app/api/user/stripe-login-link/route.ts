import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { assertStripeModeMatchesEnv } from "@/lib/stripe-env";

assertStripeModeMatchesEnv();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // #region agent log
    fetch("http://127.0.0.1:7581/ingest/4c9de01a-e4bd-4cc4-acce-f5ab7832ce40", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "da8230" },
      body: JSON.stringify({
        sessionId: "da8230",
        runId: "pre-fix",
        hypothesisId: "H2",
        location: "app/api/user/stripe-login-link/route.ts:18",
        message: "stripe_login_link_unauthorized",
        data: { hasUser: false },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("stripe_account_id")
    .eq("id", user.id)
    .single();

  const accountId = profile?.stripe_account_id;
  // #region agent log
  fetch("http://127.0.0.1:7581/ingest/4c9de01a-e4bd-4cc4-acce-f5ab7832ce40", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "da8230" },
    body: JSON.stringify({
      sessionId: "da8230",
      runId: "pre-fix",
      hypothesisId: "H3",
      location: "app/api/user/stripe-login-link/route.ts:30",
      message: "stripe_login_link_profile_loaded",
      data: { hasUser: true, hasStripeAccountId: Boolean(accountId) },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  if (!accountId) {
    return NextResponse.json(
      { error: "No payment account linked. Complete payouts setup first." },
      { status: 400 }
    );
  }

  try {
    // #region agent log
    fetch("http://127.0.0.1:7581/ingest/4c9de01a-e4bd-4cc4-acce-f5ab7832ce40", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "da8230" },
      body: JSON.stringify({
        sessionId: "da8230",
        runId: "pre-fix",
        hypothesisId: "H4",
        location: "app/api/user/stripe-login-link/route.ts:50",
        message: "stripe_login_link_request_start",
        data: { hasStripeAccountId: true },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    const loginLink = await stripe.accounts.createLoginLink(accountId);
    // #region agent log
    fetch("http://127.0.0.1:7581/ingest/4c9de01a-e4bd-4cc4-acce-f5ab7832ce40", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "da8230" },
      body: JSON.stringify({
        sessionId: "da8230",
        runId: "pre-fix",
        hypothesisId: "H4",
        location: "app/api/user/stripe-login-link/route.ts:65",
        message: "stripe_login_link_request_success",
        data: { hasUrl: Boolean(loginLink?.url) },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return NextResponse.json({ url: loginLink.url });
  } catch (e) {
    // #region agent log
    fetch("http://127.0.0.1:7581/ingest/4c9de01a-e4bd-4cc4-acce-f5ab7832ce40", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "da8230" },
      body: JSON.stringify({
        sessionId: "da8230",
        runId: "pre-fix",
        hypothesisId: "H5",
        location: "app/api/user/stripe-login-link/route.ts:80",
        message: "stripe_login_link_request_failed",
        data: {
          errorType: e instanceof Error ? e.name : typeof e,
          errorMessage: e instanceof Error ? e.message : "Unknown error",
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    console.error("Stripe login link error:", e);
    return NextResponse.json(
      { error: "Could not open Stripe. Try again in a moment." },
      { status: 500 }
    );
  }
}
