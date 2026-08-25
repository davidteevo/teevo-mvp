import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BuyerFeeSettingsError, getBuyerFeeSettings } from "@/lib/fees/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getBuyerFeeSettings(createAdminClient());
    return NextResponse.json(settings);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Buyer Protection Fee settings are unavailable.";
    console.error("[api/fees]", e);
    const status = e instanceof BuyerFeeSettingsError ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
