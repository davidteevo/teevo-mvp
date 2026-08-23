import { NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/referral/admin-auth";
import { getAdminUserAudit, getAdminUserNotes } from "@/lib/admin-users";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  try {
    const [notes, audit] = await Promise.all([
      getAdminUserNotes(auth.admin, id),
      getAdminUserAudit(auth.admin, id),
    ]);
    return NextResponse.json({ notes, audit });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load admin notes" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const note = String(body.body ?? body.note ?? "").trim();
  if (!note) return NextResponse.json({ error: "Note cannot be empty" }, { status: 400 });

  const { error } = await auth.admin.from("admin_user_notes").insert({
    user_id: id,
    admin_id: auth.user.id,
    body: note,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(auth.admin, {
    adminId: auth.user.id,
    action: "ADMIN_NOTE_ADDED",
    targetType: "user",
    targetId: id,
  });
  const notes = await getAdminUserNotes(auth.admin, id);
  return NextResponse.json({ ok: true, notes });
}
