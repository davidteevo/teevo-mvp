import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/app-env";
import {
  REF_COOKIE,
  VISITOR_COOKIE,
  recordReferralVisit,
  referralCookieOptions,
} from "@/lib/referral/attribution";
import { lookupReferralCode, normalizeReferralCode } from "@/lib/referral/codes";
import { trackServerEvent } from "@/lib/starter-pack";

export const dynamic = "force-dynamic";

function newVisitorKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `v_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: raw } = await params;
  const code = normalizeReferralCode(raw);
  const appUrl = getAppUrl() || new URL(request.url).origin;
  const redirectTo = new URL("/", appUrl);
  const cookieOpts = referralCookieOptions();

  if (!code) {
    return NextResponse.redirect(redirectTo);
  }

  const admin = createAdminClient();
  const row = await lookupReferralCode(admin, code);
  if (!row || row.status !== "active") {
    return NextResponse.redirect(redirectTo);
  }

  const incoming = request.headers.get("cookie") ?? "";
  const existingVid = incoming.match(/(?:^|;\s*)teevo_vid=([^;]*)/)?.[1];
  const visitorKey = existingVid ? decodeURIComponent(existingVid) : newVisitorKey();

  await recordReferralVisit(admin, {
    codeId: row.id,
    visitorKey,
    landingPath: `/r/${code}`,
  });
  await trackServerEvent(admin, "referral_link_clicked", {
    properties: { code: row.code, kind: row.kind, referral_code_id: row.id },
  });

  const response = NextResponse.redirect(redirectTo);
  response.cookies.set(REF_COOKIE, row.code, cookieOpts);
  response.cookies.set(VISITOR_COOKIE, visitorKey, cookieOpts);
  return response;
}
