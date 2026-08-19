import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/app-env";
import { assertStripeModeMatchesEnv } from "@/lib/stripe-env";
import {
  createExpressStripeAccount,
  createStripeConnectAccessUrl,
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
    .select(
      "stripe_account_id, role, first_name, surname, address_line1, address_line2, address_city, address_postcode, address_country, date_of_birth"
    )
    .eq("id", user.id)
    .single();

  const accountId = profile?.stripe_account_id;
  if (!accountId) {
    return NextResponse.json(
      { error: "No payment account linked. Complete payouts setup first." },
      { status: 400 }
    );
  }

  const appUrl = getAppUrl();
  const returnUrl = `${appUrl}/dashboard/settings/payments?stripe=return`;
  const refreshUrl = `${appUrl}/dashboard/settings/payments?stripe=refresh`;

  try {
    const validAccountId = await ensurePlatformStripeAccount(stripe, admin, {
      userId: user.id,
      email: user.email,
      profile,
      existingAccountId: accountId,
    });
    const { url, linkType } = await createStripeConnectAccessUrl(stripe, validAccountId, {
      returnUrl,
      refreshUrl,
      email: user.email,
    });
    return NextResponse.json({ url, linkType });
  } catch (e) {
    if (!shouldRotateStripeAccount(e)) {
      console.error("Stripe login link error:", e);
      const detail = e instanceof Error ? e.message : "Unknown error";
      return NextResponse.json({ error: `Could not open Stripe. ${detail}` }, { status: 500 });
    }

    try {
      const replacement = await createExpressStripeAccount(stripe, { email: user.email, profile });
      await persistStripeAccountId(admin, user.id, replacement.id, profile?.role);
      const { url, linkType } = await createStripeConnectAccessUrl(stripe, replacement.id, {
        returnUrl,
        refreshUrl,
        email: user.email,
      });
      return NextResponse.json({ url, linkType });
    } catch (rotateError) {
      console.error("Stripe login link rotate error:", rotateError);
      const detail = rotateError instanceof Error ? rotateError.message : "Unknown error";
      return NextResponse.json({ error: `Could not open Stripe. ${detail}` }, { status: 500 });
    }
  }
}
