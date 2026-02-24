import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const ADMIN_DOMAIN = process.env.NEXT_PUBLIC_ADMIN_DOMAIN;
const MAIN_SITE_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://app.teevohq.com";

// Paths that must stay on admin host (auth + admin UI). Everything else on admin host goes to main app.
const ALLOWED_ON_ADMIN = ["/admin", "/login", "/signup", "/auth"];

function isAdminHost(host: string): boolean {
  if (!host) return false;
  const domain = ADMIN_DOMAIN?.toLowerCase();
  if (domain && host.toLowerCase().split(":")[0] === domain) return true;
  // Fallback: host starts with "admin." so we don't depend on env being set
  return host.toLowerCase().split(":")[0].startsWith("admin.");
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const pathname = request.nextUrl.pathname;

  if (isAdminHost(host)) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    const allowed = ALLOWED_ON_ADMIN.some((p) => pathname === p || pathname.startsWith(p + "/"));
    if (!allowed) {
      return NextResponse.redirect(new URL(pathname + request.nextUrl.search, MAIN_SITE_URL));
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
