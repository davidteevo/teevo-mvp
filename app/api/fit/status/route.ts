import { NextResponse } from "next/server";
import { isMatchEnabled } from "@/lib/match-settings";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Whether Teevo Fit is switched on in admin settings. Does not grant access. */
export async function GET() {
  try {
    const enabled = await isMatchEnabled(createAdminClient());
    return NextResponse.json(
      { enabled },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { enabled: false },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
