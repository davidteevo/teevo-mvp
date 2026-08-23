import { NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/referral/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const { data: profile } = await auth.admin.from("users").select("id, account_status").eq("id", id).maybeSingle();
  if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { error } = await auth.admin
    .from("users")
    .update({
      account_status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(auth.admin, {
    adminId: auth.user.id,
    action: "USER_REINSTATED",
    targetType: "user",
    targetId: id,
  });
  return NextResponse.json({ ok: true });
}
