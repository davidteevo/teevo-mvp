import { NextResponse } from "next/server";
import {
  BuyerFeeSettingsError,
  getBuyerFeeSettings,
  parseBuyerFeePercentage,
  parseBuyerFeeFixedPence,
  parsePoundsToPence,
  setBuyerFeeSettings,
} from "@/lib/fees/settings";
import { logAdminAction, requireAdmin } from "@/lib/referral/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    const settings = await getBuyerFeeSettings(auth.admin);
    return NextResponse.json(settings);
  } catch (e) {
    const status = e instanceof BuyerFeeSettingsError ? 503 : 500;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load fee settings" },
      { status }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const percentage = parseBuyerFeePercentage(body.percentage);
    let fixedPence: number;
    if (body.fixedPence !== undefined) {
      fixedPence = parseBuyerFeeFixedPence(body.fixedPence);
    } else if (body.fixedPounds !== undefined) {
      fixedPence = parsePoundsToPence(body.fixedPounds, "Fixed fee");
    } else {
      return NextResponse.json({ error: "Fixed fee is required" }, { status: 400 });
    }

    const previous = await getBuyerFeeSettings(auth.admin);
    const settings = await setBuyerFeeSettings(auth.admin, { percentage, fixedPence });
    await logAdminAction(auth.admin, {
      adminId: auth.user.id,
      action: "update_buyer_fee_settings",
      targetType: "platform_settings",
      targetId: auth.user.id,
      payload: { previous, next: settings },
    });
    return NextResponse.json(settings);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to save fee settings" },
      { status: 400 }
    );
  }
}
