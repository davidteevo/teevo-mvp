import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;

/**
 * Server-side recovery: verify token_hash from generateLink (hashed_token) and set
 * session in cookies, then redirect to the reset-password page. Works with PKCE
 * and when email clients strip URL fragments.
 * Cookies are set on the redirect response so the browser receives them (Next.js
 * can drop cookies set via cookies() when returning a redirect).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const base = new URL(request.url).origin;
  const resetPath = `${base}/login/reset-password`;
  const errorPath = `${base}/login/reset-password?error=invalid_link`;

  if (!token_hash) {
    console.error("[set-password] Missing token_hash in URL");
    return NextResponse.redirect(errorPath);
  }

  const cookieStore = await cookies();
  type CookieEntry = { name: string; value: string; options?: Record<string, unknown> };
  const cookiesToSet: CookieEntry[] = [];
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookies: CookieEntry[]) {
          cookiesToSet.push(...cookies);
          cookies.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as Record<string, unknown>)
          );
        },
      },
      ...(cookieDomain ? { cookieOptions: { domain: cookieDomain } } : {}),
    }
  );

  const { data, error } = await supabase.auth.verifyOtp({
    type: "recovery",
    token_hash,
  });

  if (error) {
    console.error("[set-password] verifyOtp failed:", error.message);
    return NextResponse.redirect(errorPath);
  }

  if (!data?.session) {
    console.error("[set-password] verifyOtp ok but no session in response");
    return NextResponse.redirect(errorPath);
  }

  const { error: setError } = await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
  if (setError) {
    console.error("[set-password] setSession after verifyOtp failed:", setError.message);
    return NextResponse.redirect(errorPath);
  }

  const response = NextResponse.redirect(resetPath, { status: 302 });
  for (const { name, value, options } of cookiesToSet) {
    response.cookies.set(name, value, (options ?? {}) as Parameters<typeof response.cookies.set>[2]);
  }
  return response;
}
