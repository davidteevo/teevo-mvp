import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/referral/admin-auth";
import { ADMIN_USER_PAGE_SIZE, getAdminUserListings } from "@/lib/admin-users";

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
  try {
    const data = await getAdminUserListings(auth.admin, id, offset, ADMIN_USER_PAGE_SIZE);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load listings" },
      { status: 500 }
    );
  }
}
