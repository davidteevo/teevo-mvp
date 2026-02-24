import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";
import { NextResponse } from "next/server";

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
  const returnUrl = body.returnUrl ?? `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard`;
  const refreshUrl = body.refreshUrl ?? `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard`;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("stripe_account_id, role, address_line1, address_line2, address_city, address_postcode, address_country, date_of_birth")
    .eq("id", user.id)
    .single();

  let accountId = profile?.stripe_account_id;

  if (!accountId) {
    const hasAddress =
      profile?.address_line1 &&
      profile?.address_city &&
      profile?.address_postcode &&
      profile?.address_country;
    const address = hasAddress
      ? {
          line1: profile.address_line1,
          line2: profile.address_line2 || undefined,
          city: profile.address_city,
          postal_code: profile.address_postcode,
          country: profile.address_country,
        }
      : undefined;

    let dob: { day: number; month: number; year: number } | undefined;
    if (profile?.date_of_birth) {
      const d = new Date(profile.date_of_birth);
      if (!Number.isNaN(d.getTime())) {
        dob = { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() };
      }
    }

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
      ...(address || dob ? { individual: { ...(address && { address }), ...(dob && { dob }) } } : {}),
    });
    accountId = account.id;
    const updated_at = new Date().toISOString();
    await admin
      .from("users")
      .update({
        stripe_account_id: accountId,
        updated_at,
        ...(profile?.role !== "admin" ? { role: "seller" } : {}),
      })
      .eq("id", user.id);
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    return_url: returnUrl,
    refresh_url: refreshUrl,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: link.url });
}
