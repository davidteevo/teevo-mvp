import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { ensureUserEmailConfirmedAt } from "@/lib/user-email-confirmed";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/mark-email-confirmed
 * Stamps users.email_confirmed_at after signup email verification (best-effort).
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  await ensureUserEmailConfirmedAt(admin, user.id, user.email_confirmed_at ?? null);
  return NextResponse.json({ ok: true });
}
