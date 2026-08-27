import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getCreatorStatusForUser } from "@/lib/creator/hub";
import { getReferralSettings } from "@/lib/referral/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const settings = await getReferralSettings(admin);
  const status = await getCreatorStatusForUser(admin, user.id);

  return NextResponse.json({
    isCreator: status.isCreator && settings.creatorEnabled,
    status: status.status,
    programmeEnabled: settings.creatorEnabled,
  });
}
