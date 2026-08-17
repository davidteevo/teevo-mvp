import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/referral/admin-auth";
import { resendAvailabilityBatch } from "@/lib/listing-availability-admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/listings/availability/resend
 * Body: { batchId: string }
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const body = await request.json().catch(() => ({}));
  const batchId = typeof body.batchId === "string" ? body.batchId : "";
  if (!batchId) {
    return NextResponse.json({ error: "batchId required" }, { status: 400 });
  }

  const result = await resendAvailabilityBatch(auth.admin, { batchId });
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Could not resend" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
