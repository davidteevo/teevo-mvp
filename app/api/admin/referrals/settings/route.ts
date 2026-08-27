import { NextResponse } from "next/server";
import { notifyCreatorsOfProgrammeChanges } from "@/lib/creator/programme-change-notify";
import { getReferralSettings, setReferralSettings, type ReferralSettingsPatch } from "@/lib/referral/settings";
import { logAdminAction, requireAdmin } from "@/lib/referral/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    const settings = await getReferralSettings(auth.admin);
    return NextResponse.json(settings);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    let body: ReferralSettingsPatch;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const previous = await getReferralSettings(auth.admin);
    const settings = await setReferralSettings(auth.admin, body);
    await logAdminAction(auth.admin, {
      adminId: auth.user.id,
      action: "update_referral_settings",
      targetType: "platform_settings",
      targetId: auth.user.id,
      payload: { previous, next: settings },
    });
    try {
      await notifyCreatorsOfProgrammeChanges(auth.admin, previous, settings);
    } catch (e) {
      console.error("creator programme-change notify failed", e);
    }
    return NextResponse.json(settings);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 400 }
    );
  }
}
