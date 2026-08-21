import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { runAdminNewUsersDigest } from "@/lib/admin-new-users-digest";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/admin-new-users-digest
 * Sends the daily admin new-users digest (Europe/London 18:00). Protect with CRON_SECRET.
 * Optional ?force=1 skips the London hour gate (still requires CRON_SECRET when set).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = request.headers.get("x-cron-secret");
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}` && cronSecret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";

  const admin = createAdminClient();
  try {
    const result = await runAdminNewUsersDigest(admin, { force });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("admin-new-users-digest cron failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Cron failed" },
      { status: 500 }
    );
  }
}
