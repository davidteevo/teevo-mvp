import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;

/**
 * GET /api/auth/signout
 * Server-side sign out: clears Supabase auth cookies and redirects to /.
 * Explicitly clears all sb-* cookies to work around Supabase/SSR cookie persistence issues.
 */
export async function GET(request: NextRequest) {
  const url = new URL("/", request.url);
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

  await supabase.auth.signOut({ scope: "local" });

  // Manually clear any Supabase auth cookies (sb-*) that may have survived
  const clearOptions: Record<string, unknown> = {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  };
  if (cookieDomain) {
    clearOptions.domain = cookieDomain;
  }
  const allCookies = request.cookies.getAll();
  for (const { name } of allCookies) {
    if (name.startsWith("sb-")) {
      response.cookies.set(name, "", clearOptions);
    }
  }

  return response;
}
