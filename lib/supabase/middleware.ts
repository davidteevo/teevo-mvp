import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;

export async function updateSession(request: NextRequest) {
  // Skip session refresh on sign-out so we don't re-establish the session before the route clears cookies
  if (request.nextUrl.pathname === "/api/auth/signout") {
    return NextResponse.next({ request });
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    console.error(
      "Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set (e.g. in Netlify env vars)."
    );
    return NextResponse.next({ request });
  }
  let response = NextResponse.next({ request });
  try {
    const supabase = createServerClient(
      supabaseUrl,
      anonKey,
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
    await supabase.auth.getUser();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[Supabase middleware] updateSession failed:", message);
    // Continue the request so the app can still load; session refresh will be skipped
  }
  return response;
}
