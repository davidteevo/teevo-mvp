import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;

/**
 * GET /api/auth/signout
 * Server-side sign out: clears Supabase auth cookies and redirects.
 * Use ?redirect=/signup (or other path) to send the user somewhere after sign out.
 * Explicitly clears all sb-* cookies to work around Supabase/SSR cookie persistence issues.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const redirectTo = searchParams.get("redirect");
  const path = redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/";
  const url = new URL(path, request.url);
  const response = NextResponse.redirect(url);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
      ...(cookieDomain ? { cookieOptions: { domain: cookieDomain } } : {}),
    }
  );

  await supabase.auth.signOut({ scope: "global" });

  // Manually clear any Supabase auth cookies (sb-*) so the session cannot be restored.
  // Clear both host-only and domain-scoped variants (e.g. after enabling NEXT_PUBLIC_COOKIE_DOMAIN).
  const baseClear: Record<string, unknown> = {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    sameSite: "lax" as const,
  };
  const allCookies = request.cookies.getAll();
  const sbNames = new Set<string>();
  for (const { name } of allCookies) {
    if (name.startsWith("sb-")) sbNames.add(name);
  }
  for (const name of sbNames) {
    response.cookies.set(name, "", { ...baseClear });
    if (cookieDomain) {
      response.cookies.set(name, "", { ...baseClear, domain: cookieDomain });
    }
  }

  return response;
}
