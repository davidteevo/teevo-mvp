import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/referral/admin-auth";
import { requestAvailabilityReconfirm } from "@/lib/listing-availability-admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/listings/availability/reconfirm
 * Body: { listingIds: string[] }
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const body = await request.json().catch(() => ({}));
  const listingIds = Array.isArray(body.listingIds)
    ? body.listingIds.filter((id: unknown) => typeof id === "string")
    : [];
  if (listingIds.length === 0) {
    return NextResponse.json({ error: "listingIds required" }, { status: 400 });
  }

  try {
    const result = await requestAvailabilityReconfirm(auth.admin, {
      listingIds,
      adminId: auth.user.id,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("reconfirm availability failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not request confirmation" },
      { status: 500 }
    );
  }
}
