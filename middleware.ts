import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const ADMIN_DOMAIN = process.env.NEXT_PUBLIC_ADMIN_DOMAIN;
const MAIN_SITE_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://app.teevohq.com";

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const pathname = request.nextUrl.pathname;

  if (ADMIN_DOMAIN && host === ADMIN_DOMAIN) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (!pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL(pathname + request.nextUrl.search, MAIN_SITE_URL));
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
