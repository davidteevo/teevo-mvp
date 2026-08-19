import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { assertStripeModeMatchesEnv } from "@/lib/stripe-env";
import {
  createExpressStripeAccount,
  ensurePlatformStripeAccount,
  persistStripeAccountId,
  shouldRotateStripeAccount,
} from "@/lib/stripe-account";

assertStripeModeMatchesEnv();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("stripe_account_id, role, first_name, surname")
    .eq("id", user.id)
    .single();

  const accountId = profile?.stripe_account_id;
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
        hypothesisId: "H12",
        location: "app/api/user/stripe-login-link/route.ts:43",
        message: "stripe_login_link_attempt",
        data: { hasStoredStripeAccountId: Boolean(accountId) },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    const validAccountId = await ensurePlatformStripeAccount(stripe, admin, {
      userId: user.id,
      email: user.email,
      profile,
      existingAccountId: accountId,
    });
    const loginLink = await stripe.accounts.createLoginLink(validAccountId);
    return NextResponse.json({ url: loginLink.url });
  } catch (e) {
    if (!shouldRotateStripeAccount(e)) {
      // #region agent log
      fetch("http://127.0.0.1:7581/ingest/4c9de01a-e4bd-4cc4-acce-f5ab7832ce40", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "da8230" },
        body: JSON.stringify({
          sessionId: "da8230",
          runId: "pre-fix",
          hypothesisId: "H13",
          location: "app/api/user/stripe-login-link/route.ts:58",
          message: "stripe_login_link_non_rotate_error",
          data: {
            errorType: e instanceof Error ? e.name : typeof e,
            errorMessage: e instanceof Error ? e.message : "Unknown error",
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      console.error("Stripe login link error:", e);
      const detail = e instanceof Error ? e.message : "Unknown error";
      return NextResponse.json({ error: `Could not open Stripe. ${detail}` }, { status: 500 });
    }

    try {
      const replacement = await createExpressStripeAccount(stripe, { email: user.email, profile });
      await persistStripeAccountId(admin, user.id, replacement.id, profile?.role);
      const retryLoginLink = await stripe.accounts.createLoginLink(replacement.id);
      return NextResponse.json({ url: retryLoginLink.url });
    } catch (rotateError) {
      let accountState: {
        payouts_enabled?: boolean;
        details_submitted?: boolean;
        charges_enabled?: boolean;
        type?: string;
      } = {};
      try {
        const current = await stripe.accounts.retrieve(accountId);
        accountState = {
          payouts_enabled: current.payouts_enabled,
          details_submitted: current.details_submitted,
          charges_enabled: current.charges_enabled,
          type: current.type,
        };
      } catch {
        // ignore secondary introspection failure
      }
      // #region agent log
      fetch("http://127.0.0.1:7581/ingest/4c9de01a-e4bd-4cc4-acce-f5ab7832ce40", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "da8230" },
        body: JSON.stringify({
          sessionId: "da8230",
          runId: "pre-fix",
          hypothesisId: "H14",
          location: "app/api/user/stripe-login-link/route.ts:84",
          message: "stripe_login_link_rotate_failed",
          data: {
            rotateErrorType: rotateError instanceof Error ? rotateError.name : typeof rotateError,
            rotateErrorMessage: rotateError instanceof Error ? rotateError.message : "Unknown error",
            accountState,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      console.error("Stripe login link rotate error:", rotateError);
      const detail = rotateError instanceof Error ? rotateError.message : "Unknown error";
      return NextResponse.json({ error: `Could not open Stripe. ${detail}` }, { status: 500 });
    }
  }
}
