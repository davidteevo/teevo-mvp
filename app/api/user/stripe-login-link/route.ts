import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { assertStripeModeMatchesEnv } from "@/lib/stripe-env";

assertStripeModeMatchesEnv();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });

export const dynamic = "force-dynamic";

function shouldRotateStripeAccount(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("does not have access to account") ||
    message.includes("account does not exist") ||
    message.includes("application access may have been revoked")
  );
}

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
    let rotateAttempted = false;
    let rotateSucceeded = false;
    let rotateFailureDetail: string | null = null;

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
          rotateAccountCandidate: shouldRotateStripeAccount(e),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    if (shouldRotateStripeAccount(e)) {
      rotateAttempted = true;
      try {
        // #region agent log
        fetch("http://127.0.0.1:7581/ingest/4c9de01a-e4bd-4cc4-acce-f5ab7832ce40", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "da8230" },
          body: JSON.stringify({
            sessionId: "da8230",
            runId: "post-fix",
            hypothesisId: "H11",
            location: "app/api/user/stripe-login-link/route.ts:124",
            message: "stripe_login_link_rotate_account_start",
            data: { hadPreviousAccountId: true },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion

        const appUrl = process.env.NEXT_PUBLIC_APP_URL;
        const replacementAccount = await stripe.accounts.create({
          type: "express",
          country: "GB",
          business_type: "individual",
          email: user.email ?? undefined,
          business_profile: {
            product_description: "Selling pre-owned golf equipment as an individual on Teevo.",
            ...(appUrl ? { url: appUrl } : {}),
          },
        });

        await admin
          .from("users")
          .update({ stripe_account_id: replacementAccount.id, updated_at: new Date().toISOString() })
          .eq("id", user.id);

        const retryLoginLink = await stripe.accounts.createLoginLink(replacementAccount.id);
        rotateSucceeded = true;

        // #region agent log
        fetch("http://127.0.0.1:7581/ingest/4c9de01a-e4bd-4cc4-acce-f5ab7832ce40", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "da8230" },
          body: JSON.stringify({
            sessionId: "da8230",
            runId: "post-fix",
            hypothesisId: "H11",
            location: "app/api/user/stripe-login-link/route.ts:154",
            message: "stripe_login_link_rotate_account_success",
            data: { hasRetryUrl: Boolean(retryLoginLink?.url) },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion

        return NextResponse.json({ url: retryLoginLink.url });
      } catch (rotateError) {
        rotateFailureDetail = rotateError instanceof Error ? rotateError.message : "Unknown rotate error";
        // #region agent log
        fetch("http://127.0.0.1:7581/ingest/4c9de01a-e4bd-4cc4-acce-f5ab7832ce40", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "da8230" },
          body: JSON.stringify({
            sessionId: "da8230",
            runId: "post-fix",
            hypothesisId: "H11",
            location: "app/api/user/stripe-login-link/route.ts:171",
            message: "stripe_login_link_rotate_account_failed",
            data: {
              errorType: rotateError instanceof Error ? rotateError.name : typeof rotateError,
              errorMessage: rotateError instanceof Error ? rotateError.message : "Unknown error",
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
      }
    }

    console.error("Stripe login link error:", e);
    const detail = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      {
        error: `Could not open Stripe. ${detail}`,
        debug: {
          rotateAttempted,
          rotateSucceeded,
          rotateFailureDetail,
          staleAccountDetected: shouldRotateStripeAccount(e),
        },
      },
      { status: 500 }
    );
  }
}
