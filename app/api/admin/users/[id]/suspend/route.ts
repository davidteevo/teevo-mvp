import { NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/referral/admin-auth";
import { setListingBuyingPaused } from "@/lib/listing-availability-admin";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const reason = String(body.reason ?? "").trim();
  if (!reason) {
    return NextResponse.json({ error: "A suspension reason is required" }, { status: 400 });
  }

  const { data: profile } = await auth.admin.from("users").select("id, account_status").eq("id", id).maybeSingle();
  if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const now = new Date().toISOString();
  const { error } = await auth.admin
    .from("users")
    .update({
      account_status: "suspended",
      suspended_at: now,
      suspended_by: auth.user.id,
      suspension_reason: reason,
      updated_at: now,
    })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: listings } = await auth.admin
    .from("listings")
    .select("id")
    .eq("user_id", id)
    .is("archived_at", null)
    .in("status", ["pending", "verified"]);
  const listingIds = (listings ?? []).map((l) => l.id as string);
  if (listingIds.length > 0) {
    await setListingBuyingPaused(auth.admin, {
      listingIds,
      paused: true,
      adminId: auth.user.id,
    });
  }

  await logAdminAction(auth.admin, {
    adminId: auth.user.id,
    action: "USER_SUSPENDED",
    targetType: "user",
    targetId: id,
    payload: { reason, paused_listing_ids: listingIds },
  });
  return NextResponse.json({ ok: true });
}
