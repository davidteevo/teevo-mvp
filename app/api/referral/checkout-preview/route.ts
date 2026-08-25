import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { calcOrderBreakdown } from "@/lib/pricing";
import { BuyerFeeSettingsError, getBuyerFeeSettings } from "@/lib/fees/settings";
import { computeCheckoutIncentives } from "@/lib/referral/checkout-incentives";
import { resolveCheckoutIncentivesForBuyer } from "@/lib/referral/rewards";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const itemPence = parseInt(searchParams.get("itemPence") ?? "0", 10);
  if (!Number.isFinite(itemPence) || itemPence <= 0) {
    return NextResponse.json({ error: "itemPence required" }, { status: 400 });
  }
  const applyCredit = searchParams.get("applyCredit") !== "false";
  const admin = createAdminClient();
  let breakdown;
  try {
    const fees = await getBuyerFeeSettings(admin);
    breakdown = calcOrderBreakdown(itemPence, fees);
  } catch (e) {
    if (e instanceof BuyerFeeSettingsError) {
      console.error("[checkout-preview] fee settings unavailable", e);
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    throw e;
  }
  const eligibility = await resolveCheckoutIncentivesForBuyer(admin, {
    buyerId: user.id,
    itemPence: breakdown.itemPence,
    authenticityPence: breakdown.authenticityPence,
    shippingPence: breakdown.shippingPence,
    applyCredit,
  });
  const incentives = computeCheckoutIncentives({
    itemPence: breakdown.itemPence,
    authenticityPence: breakdown.authenticityPence,
    shippingPence: breakdown.shippingPence,
    referralDiscountPence: eligibility.referralDiscountPence,
    availableCreditPence: eligibility.availableCreditPence,
    applyCredit: eligibility.applyCredit,
  });

  return NextResponse.json({
    ...incentives,
    availableCreditPence: eligibility.availableCreditPence,
    discountEligible: eligibility.discountEligible,
    discountReason: eligibility.discountReason,
    hasReferral: eligibility.hasReferral,
  });
}
