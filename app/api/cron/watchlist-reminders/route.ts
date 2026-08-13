import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { runWatchlistReminderCron } from "@/lib/watchlist-emails";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/watchlist-reminders
 * Sends 3-day still-available Watchlist emails. Protect with CRON_SECRET.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = request.headers.get("x-cron-secret");
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}` && cronSecret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  try {
    const result = await runWatchlistReminderCron(admin);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("watchlist-reminders cron failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Cron failed" },
      { status: 500 }
    );
  }
}
