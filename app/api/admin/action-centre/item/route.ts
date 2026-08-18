import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/referral/admin-auth";
import { AdminActionType, type AdminActionTypeValue } from "@/lib/admin-action-centre";
import { getAdminActionDetail } from "@/lib/admin-action-centre-data";

export const dynamic = "force-dynamic";

const ACTION_TYPES = new Set<string>(Object.values(AdminActionType));

/**
 * GET /api/admin/action-centre/item?actionType=&entityId=
 * Detail payload for the Action Centre review drawer. Photos are not signed here;
 * packaging images are streamed via the existing packaging-photo route.
 */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const actionType = searchParams.get("actionType") ?? "";
  const entityId = searchParams.get("entityId")?.trim() ?? "";
  if (!ACTION_TYPES.has(actionType) || !entityId) {
    return NextResponse.json({ error: "actionType and entityId are required" }, { status: 400 });
  }

  try {
    const detail = await getAdminActionDetail(auth.admin, actionType as AdminActionTypeValue, entityId);
    if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ detail });
  } catch (e) {
    console.error("Admin action-centre item error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
