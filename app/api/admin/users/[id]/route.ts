import { NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/referral/admin-auth";
import { getAdminUserDetail } from "@/lib/admin-users";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  try {
    const user = await getAdminUserDetail(auth.admin, id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ user });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load user" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.role === "string") {
    if (!["buyer", "seller", "admin"].includes(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    updates.role = body.role;
  }
  if ("first_name" in body) updates.first_name = typeof body.first_name === "string" ? body.first_name.trim() || null : null;
  if ("surname" in body) updates.surname = typeof body.surname === "string" ? body.surname.trim() || null : null;
  if ("display_name" in body)
    updates.display_name = typeof body.display_name === "string" ? body.display_name.trim() || null : null;
  if ("phone" in body) updates.phone = typeof body.phone === "string" ? body.phone.trim() || null : null;

  const keys = Object.keys(updates).filter((k) => k !== "updated_at");
  if (keys.length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { error } = await auth.admin.from("users").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(auth.admin, {
    adminId: auth.user.id,
    action: body.role && keys.length === 1 ? "USER_ROLE_UPDATED" : "USER_PROFILE_UPDATED",
    targetType: "user",
    targetId: id,
    payload: { fields: keys },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  if (id === auth.user.id) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  }

  const { count: txCount } = await auth.admin
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .or(`buyer_id.eq.${id},seller_id.eq.${id}`);
  if (txCount && txCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete user with transaction history. Remove or reassign transactions first." },
      { status: 400 }
    );
  }

  const { count: reviewCount } = await auth.admin
    .from("seller_reviews")
    .select("id", { count: "exact", head: true })
    .or(`buyer_id.eq.${id},seller_id.eq.${id}`);
  if (reviewCount && reviewCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete user with seller feedback history." },
      { status: 400 }
    );
  }

  const { error: authError } = await auth.admin.auth.admin.deleteUser(id);
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });
  await auth.admin.from("users").delete().eq("id", id);
  await logAdminAction(auth.admin, {
    adminId: auth.user.id,
    action: "USER_DELETED",
    targetType: "user",
    targetId: id,
  });
  return NextResponse.json({ ok: true });
}
