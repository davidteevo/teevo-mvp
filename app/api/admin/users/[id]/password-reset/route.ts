import { NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/referral/admin-auth";
import { sendPasswordResetEmail } from "@/lib/auth/send-password-reset";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const { data: profile } = await auth.admin
    .from("users")
    .select("email, first_name")
    .eq("id", id)
    .maybeSingle();
  if (!profile?.email) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  try {
    await sendPasswordResetEmail(profile.email, profile.first_name);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to send password reset email" },
      { status: 500 }
    );
  }
  await logAdminAction(auth.admin, {
    adminId: auth.user.id,
    action: "PASSWORD_RESET_SENT",
    targetType: "user",
    targetId: id,
    payload: { email: profile.email },
  });
  return NextResponse.json({ ok: true });
}
