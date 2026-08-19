import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/app-env";
import { assertStripeModeMatchesEnv } from "@/lib/stripe-env";
import {
  createExpressStripeAccount,
  isStripeAgeError,
  persistStripeAccountId,
  resolveStripeAccountForOnboarding,
  shouldRotateStripeAccount,
  stripeUrlKind,
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

  try {
    const { accountId, strategy } = await resolveStripeAccountForOnboarding(stripe, admin, {
      userId: user.id,
      email: user.email,
      profile,
      existingAccountId: profile?.stripe_account_id,
    });

    const link = await stripe.accountLinks.create({
      account: accountId,
      return_url: returnUrl,
      refresh_url: refreshUrl,
      type: "account_onboarding",
      collection_options: { fields: "eventually_due" },
    });

    const urlKind = stripeUrlKind(link.url);
    let urlHost = "";
    let urlPathPrefix = "";
    try {
      const parsed = new URL(link.url);
      urlHost = parsed.hostname;
      urlPathPrefix = parsed.pathname.split("/").filter(Boolean).slice(0, 3).join("/");
    } catch {
      // ignore parse errors
    }

    if (urlKind === "express_login") {
      return NextResponse.json(
        {
          error:
            "Stripe returned an Express login URL instead of onboarding. Try again or contact support.",
          strategy,
          urlKind,
          urlHost,
          urlPathPrefix,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      url: link.url,
      linkType: "account_onboarding",
      strategy,
      urlKind,
      urlHost,
      urlPathPrefix,
    });
  } catch (e) {
    if (isStripeAgeError(e)) {
      try {
        const replacement = await createExpressStripeAccount(stripe, {
          email: user.email,
          profile: profile ? { ...profile, date_of_birth: null } : null,
        });
        await persistStripeAccountId(admin, user.id, replacement.id, profile?.role);
        const link = await stripe.accountLinks.create({
          account: replacement.id,
          return_url: returnUrl,
          refresh_url: refreshUrl,
          type: "account_onboarding",
          collection_options: { fields: "eventually_due" },
        });
        return NextResponse.json({
          url: link.url,
          linkType: "account_onboarding",
          strategy: "fresh",
          urlKind: stripeUrlKind(link.url),
        });
      } catch (retryError) {
        console.error("Stripe connect age-error recovery failed:", retryError);
        const detail = retryError instanceof Error ? retryError.message : "Unknown error";
        return NextResponse.json(
          {
            error:
              "Could not start Stripe onboarding. Check your date of birth in Settings → Postage, or leave it blank and enter it on Stripe.",
            detail,
          },
          { status: 500 }
        );
      }
    }

    if (!shouldRotateStripeAccount(e)) {
      console.error("Stripe connect account link error:", e);
      const detail = e instanceof Error ? e.message : "Unknown error";
      return NextResponse.json({ error: `Could not start Stripe onboarding. ${detail}` }, { status: 500 });
    }

    const replacement = await createExpressStripeAccount(stripe, { email: user.email, profile });
    await persistStripeAccountId(admin, user.id, replacement.id, profile?.role);

    const link = await stripe.accountLinks.create({
      account: replacement.id,
      return_url: returnUrl,
      refresh_url: refreshUrl,
      type: "account_onboarding",
      collection_options: { fields: "eventually_due" },
    });

    const urlKind = stripeUrlKind(link.url);
    return NextResponse.json({
      url: link.url,
      linkType: "account_onboarding",
      strategy: "fresh",
      urlKind,
    });
  }
}
