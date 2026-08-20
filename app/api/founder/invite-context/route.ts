import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { REF_COOKIE } from "@/lib/referral/attribution";
import { lookupReferralCode, normalizeReferralCode } from "@/lib/referral/codes";

export const dynamic = "force-dynamic";

/**
 * GET /api/founder/invite-context
 * Optional personalisation from teevo_ref cookie — first name only.
 */
export async function GET() {
  try {
    const jar = await cookies();
    const raw = jar.get(REF_COOKIE)?.value ?? "";
    const code = normalizeReferralCode(raw);
    if (!code) {
      return NextResponse.json({ referrerFirstName: null, code: null });
    }

    const admin = createAdminClient();
    const row = await lookupReferralCode(admin, code);
    if (!row || row.status !== "active") {
      return NextResponse.json({ referrerFirstName: null, code: null });
    }

    let firstName: string | null = null;
    if (row.owner_user_id) {
      const { data: owner } = await admin
        .from("users")
        .select("first_name")
        .eq("id", row.owner_user_id)
        .maybeSingle();
      const name = typeof owner?.first_name === "string" ? owner.first_name.trim() : "";
      if (name && name.length <= 40) firstName = name;
    }

    return NextResponse.json({
      referrerFirstName: firstName,
      code: row.code,
    });
  } catch (e) {
    console.error("GET /api/founder/invite-context", e);
    return NextResponse.json({ referrerFirstName: null, code: null });
  }
}
