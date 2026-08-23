import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/referral/admin-auth";
import { getAdminUserRewards } from "@/lib/admin-users";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  try {
    const data = await getAdminUserRewards(auth.admin, id);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load rewards" },
      { status: 500 }
    );
  }
}
