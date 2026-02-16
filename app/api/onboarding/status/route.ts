import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });

/**
 * GET /api/onboarding/status
 * Returns Stripe Connect onboarding status for the current user.
 * payoutsEnabled: true only when Stripe account exists and has completed onboarding (payouts_enabled).
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: profile } = await admin
    .from("users")
    .select("stripe_account_id")
    .eq("id", user.id)
    .single();

  const stripeAccountId = profile?.stripe_account_id ?? null;
  let payoutsEnabled = false;

  if (stripeAccountId) {
    try {
      const account = await stripe.accounts.retrieve(stripeAccountId);
      payoutsEnabled = account.payouts_enabled === true;
    } catch {
      // Account may be invalid or deleted
    }
  }

  return NextResponse.json({
    stripeAccountId,
    payoutsEnabled,
  });
}
