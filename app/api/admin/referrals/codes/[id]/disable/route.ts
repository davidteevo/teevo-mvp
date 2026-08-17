import { NextResponse } from "next/server";
import { disableReferralCode } from "@/lib/referral/codes";
import { logAdminAction, requireAdmin } from "@/lib/referral/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    const { id } = await params;
    await disableReferralCode(auth.admin, id);
    await logAdminAction(auth.admin, {
      adminId: auth.user.id,
      action: "disable_referral_code",
      targetType: "referral_code",
      targetId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
