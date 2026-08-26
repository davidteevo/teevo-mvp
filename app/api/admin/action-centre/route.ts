import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/referral/admin-auth";
import { getAdminActionCentre, getAdminExceptions } from "@/lib/admin-action-centre-data";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

/**
 * GET /api/admin/action-centre
 * Aggregated operational queue derived from existing listing / order / review state.
 */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const [centre, exceptions] = await Promise.all([
      getAdminActionCentre(auth.admin),
      getAdminExceptions(auth.admin),
    ]);
    return NextResponse.json(
      { ...centre, exceptions },
      {
        headers: {
          "Cache-Control": "private, no-store, no-cache, max-age=0, must-revalidate",
        },
      }
    );
  } catch (e) {
    console.error("Admin action-centre error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
