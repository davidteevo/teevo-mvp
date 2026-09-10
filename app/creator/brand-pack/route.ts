import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/app-env";
import { getReferralSettings, isCreatorBrandPackAvailable } from "@/lib/referral/settings";
import { trackServerEvent } from "@/lib/starter-pack";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALLOWED_SOURCES = new Set(["quick_tools", "creator_hub_card", "email", "direct"]);

function normalizeSource(raw: string | null): string {
  if (raw && ALLOWED_SOURCES.has(raw)) return raw;
  return "direct";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const source = normalizeSource(requestUrl.searchParams.get("source"));
  const appUrl = getAppUrl() || requestUrl.origin;
  const unavailable = new URL("/dashboard/creator?brandPack=unavailable", appUrl);

  const admin = createAdminClient();
  const settings = await getReferralSettings(admin);

  if (!isCreatorBrandPackAvailable(settings)) {
    return NextResponse.redirect(unavailable);
  }

  let userId: string | null = null;
  let creatorId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
    if (userId) {
      const { data: creator } = await admin
        .from("creators")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      creatorId = creator?.id ?? null;
    }
  } catch {
    // Best-effort identity for analytics only.
  }

  await trackServerEvent(admin, "creator_brand_pack_opened", {
    userId,
    properties: {
      source,
      creator_id: creatorId,
      user_id: userId,
    },
  });

  return NextResponse.redirect(settings.creatorBrandPackUrl.trim());
}
