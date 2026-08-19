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
      console.error("Stripe login link rotate error:", rotateError);
      const detail = rotateError instanceof Error ? rotateError.message : "Unknown error";
      return NextResponse.json({ error: `Could not open Stripe. ${detail}` }, { status: 500 });
    }
  }
}
