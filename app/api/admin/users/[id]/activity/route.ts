import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/referral/admin-auth";
import { getAdminUserActivity } from "@/lib/admin-users";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const url = new URL(request.url);
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0) || 0);
  const { data: profile } = await auth.admin.from("users").select("created_at").eq("id", id).maybeSingle();
  if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });
  try {
    const data = await getAdminUserActivity(auth.admin, id, profile.created_at, offset, 50);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load activity" },
      { status: 500 }
    );
  }
}
