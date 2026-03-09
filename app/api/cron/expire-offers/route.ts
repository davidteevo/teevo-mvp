import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/expire-offers
 * Sets status = 'expired' for offers where expires_at < now() and status = 'pending'.
 * Protect with CRON_SECRET: call with header Authorization: Bearer <CRON_SECRET> or x-cron-secret: <CRON_SECRET>.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = request.headers.get("x-cron-secret");
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}` && cronSecret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: expired, error } = await admin
    .from("offers")
    .update({ status: "expired", updated_at: now })
    .lt("expires_at", now)
    .eq("status", "pending")
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ expired: expired?.length ?? 0 });
}
