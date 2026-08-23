import { NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/referral/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const confirm = String(body.confirm_email ?? body.confirmEmail ?? "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }
  if (email !== confirm) {
    return NextResponse.json({ error: "Email addresses do not match" }, { status: 400 });
  }

  const { data: profile } = await auth.admin.from("users").select("id, email").eq("id", id).maybeSingle();
  if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const previous = (profile.email ?? "").toLowerCase();
  if (previous === email) {
    return NextResponse.json({ error: "That is already this user's email" }, { status: 400 });
  }

  const { data: existing } = await auth.admin
    .from("users")
    .select("id")
    .ilike("email", email)
    .neq("id", id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "Another Teevo account already uses this email address." },
      { status: 409 }
    );
  }

  const { data: listed } = await auth.admin.auth.admin.listUsers({ perPage: 1000 });
  const clash = (listed?.users ?? []).find(
    (u) => u.id !== id && (u.email ?? "").toLowerCase() === email
  );
  if (clash) {
    return NextResponse.json(
      { error: "Another Teevo account already uses this email address." },
      { status: 409 }
    );
  }

  const { error: authError } = await auth.admin.auth.admin.updateUserById(id, {
    email,
    email_confirm: true,
  });
  if (authError) {
    const msg = authError.message.toLowerCase().includes("already")
      ? "Another Teevo account already uses this email address."
      : authError.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { error: profileError } = await auth.admin
    .from("users")
    .update({ email, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  await logAdminAction(auth.admin, {
    adminId: auth.user.id,
    action: "USER_EMAIL_CHANGED",
    targetType: "user",
    targetId: id,
    payload: { old_email: previous, new_email: email },
  });
  return NextResponse.json({ ok: true, email });
}
