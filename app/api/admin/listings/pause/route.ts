import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/referral/admin-auth";
import { setListingBuyingPaused } from "@/lib/listing-availability-admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/listings/pause
 * Body: { listingIds: string[], paused: boolean }
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const body = await request.json().catch(() => ({}));
  if (typeof body.paused !== "boolean") {
    return NextResponse.json({ error: "paused must be a boolean" }, { status: 400 });
  }
  const listingIds = Array.isArray(body.listingIds)
    ? body.listingIds.filter((id: unknown) => typeof id === "string")
    : [];
  if (listingIds.length === 0) {
    return NextResponse.json({ error: "listingIds required" }, { status: 400 });
  }

  try {
    const result = await setListingBuyingPaused(auth.admin, {
      listingIds,
      paused: body.paused,
      adminId: auth.user.id,
    });
    return NextResponse.json({ ok: true, paused: body.paused, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not update listings" },
      { status: 500 }
    );
  }
}
