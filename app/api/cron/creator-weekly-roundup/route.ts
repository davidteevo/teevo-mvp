import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { runCreatorWeeklyRoundup } from "@/lib/creator/weekly-roundup";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/creator-weekly-roundup
 * Monday morning Creator Roundup (Europe/London). Protect with CRON_SECRET.
 * Optional ?force=1 skips day/hour gate.
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
    const result = await runCreatorWeeklyRoundup(admin, { force });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("creator-weekly-roundup cron failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Cron failed" },
      { status: 500 }
    );
  }
}
