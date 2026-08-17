import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/referral/admin-auth";
import { setListingBuyingPaused } from "@/lib/listing-availability-admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/listings/[id]/pause
 * Body: { paused: boolean }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  if (typeof body.paused !== "boolean") {
    return NextResponse.json({ error: "paused must be a boolean" }, { status: 400 });
  }

  try {
    const result = await setListingBuyingPaused(auth.admin, {
      listingIds: [id],
      paused: body.paused,
      adminId: auth.user.id,
    });
    if (result.skipped[0]?.reason === "active_order") {
      return NextResponse.json(
        { error: "This listing has an active order, so buying cannot be paused or resumed." },
        { status: 400 }
      );
    }
    if (result.skipped[0]?.reason === "not_found") {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, paused: body.paused, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not update listing" },
      { status: 500 }
    );
  }
}
