import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/app-env";
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

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const returnUrl = body.returnUrl ?? `${getAppUrl()}/dashboard`;
  const refreshUrl = body.refreshUrl ?? `${getAppUrl()}/dashboard`;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select(
      "stripe_account_id, role, first_name, surname, address_line1, address_line2, address_city, address_postcode, address_country, date_of_birth"
    )
    .eq("id", user.id)
    .single();

  let accountId = await ensurePlatformStripeAccount(stripe, admin, {
    userId: user.id,
    email: user.email,
    profile,
    existingAccountId: profile?.stripe_account_id,
  });

  try {
    const link = await stripe.accountLinks.create({
      account: accountId,
      return_url: returnUrl,
      refresh_url: refreshUrl,
      type: "account_onboarding",
    });
    return NextResponse.json({ url: link.url });
  } catch (e) {
    if (!shouldRotateStripeAccount(e)) {
      console.error("Stripe connect account link error:", e);
      const detail = e instanceof Error ? e.message : "Unknown error";
      return NextResponse.json({ error: `Could not start Stripe onboarding. ${detail}` }, { status: 500 });
    }

    const replacement = await createExpressStripeAccount(stripe, { email: user.email, profile });
    accountId = replacement.id;
    await persistStripeAccountId(admin, user.id, accountId, profile?.role);

    const link = await stripe.accountLinks.create({
      account: accountId,
      return_url: returnUrl,
      refresh_url: refreshUrl,
      type: "account_onboarding",
    });
    return NextResponse.json({ url: link.url });
  }
}
