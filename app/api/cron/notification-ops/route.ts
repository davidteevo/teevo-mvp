import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { runNotificationOpsCron } from "@/lib/notification-ops-cron";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/notification-ops
 * Creates admin SLA notifications. Protect with CRON_SECRET.
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
    const counts = await runNotificationOpsCron(admin);
    return NextResponse.json({ ok: true, ...counts });
  } catch (e) {
    console.error("notification-ops cron failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Cron failed" },
      { status: 500 }
    );
  }
}
