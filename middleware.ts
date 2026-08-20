import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { getAppUrl } from "@/lib/app-env";
import { REF_COOKIE, referralCookieOptions } from "@/lib/referral/attribution";
import { normalizeReferralCode } from "@/lib/referral/codes";

const ADMIN_DOMAIN = process.env.NEXT_PUBLIC_ADMIN_DOMAIN;
const MAIN_SITE_URL = getAppUrl();

// Paths that must stay on admin host (auth + admin UI). Everything else on admin host goes to main app.
const ALLOWED_ON_ADMIN = ["/admin", "/login", "/signup", "/auth"];

function isAdminHost(host: string): boolean {
  if (!host) return false;
  const domain = ADMIN_DOMAIN?.toLowerCase();
  if (domain && host.toLowerCase().split(":")[0] === domain) return true;
  // Fallback: host starts with "admin." so we don't depend on env being set
  return host.toLowerCase().split(":")[0].startsWith("admin.");
}

/**
 * Capture bare ?ref=CODE on any page without overwriting an existing teevo_ref cookie.
 */
function withRefCookie(request: NextRequest, response: NextResponse): NextResponse {
  const raw = request.nextUrl.searchParams.get("ref");
  if (!raw) return response;
  if (request.cookies.get(REF_COOKIE)?.value) return response;
  const code = normalizeReferralCode(raw);
  if (!code) return response;
  const opts = referralCookieOptions();
  response.cookies.set(REF_COOKIE, code, opts);
  return response;
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const pathname = request.nextUrl.pathname;

  if (isAdminHost(host)) {
    if (pathname === "/") {
      return withRefCookie(request, NextResponse.redirect(new URL("/admin", request.url)));
    }
    const allowed = ALLOWED_ON_ADMIN.some((p) => pathname === p || pathname.startsWith(p + "/"));
    if (!allowed) {
      return withRefCookie(
        request,
        NextResponse.redirect(new URL(pathname + request.nextUrl.search, MAIN_SITE_URL))
      );
    }
  }

  const sessionResponse = await updateSession(request);
  return withRefCookie(request, sessionResponse);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
