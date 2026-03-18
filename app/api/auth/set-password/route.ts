import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;

/**
 * Server-side recovery: verify token_hash and set session in cookies, then redirect
 * to the reset-password page. Works for (1) recovery emails when the Supabase
 * "Reset Password" email template uses a token-hash link, and (2) admin invite
 * links (generateLink). Use the server client so tokens from Supabase recovery
 * emails (no PKCE verifier needed) are verified correctly.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  /** Redirect to canonical app URL so we never send users to a deploy-preview origin. */
  const base =
    (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "") ||
    new URL(request.url).origin;
  const resetPath = `${base}/login/reset-password`;
  const errorPathWithReason = (reason: string) =>
    `${base}/login/reset-password?error=invalid_link&error_description=${encodeURIComponent(reason)}`;

  if (!token_hash) {
    console.error("[set-password] Missing token_hash in URL");
    // #region agent log
    fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d1a7bb" },
      body: JSON.stringify({
        sessionId: "d1a7bb",
        runId: "repro-1",
        location: "app/api/auth/set-password/route.ts:noTokenHash",
        message: "set-password called without token_hash",
        data: {},
        timestamp: Date.now(),
        hypothesisId: "S1",
      }),
    }).catch(() => {});
    // #endregion
    return NextResponse.redirect(errorPathWithReason("Missing link token"));
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

  let result = await supabase.auth.verifyOtp({
    type: "recovery",
    token_hash,
  });
  // PKCE recovery tokens from the hook often have a "pkce_" prefix; some backends look up by hash only
  if (result.error && token_hash.startsWith("pkce_")) {
    const hashOnly = token_hash.slice(5);
    result = await supabase.auth.verifyOtp({
      type: "recovery",
      token_hash: hashOnly,
    });
  }
  const { data, error } = result;

  if (error) {
    console.error("[set-password] verifyOtp failed:", error.message);
    // #region agent log
    fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d1a7bb" },
      body: JSON.stringify({
        sessionId: "d1a7bb",
        runId: "repro-1",
        location: "app/api/auth/set-password/route.ts:verifyOtpError",
        message: "verifyOtp failed in set-password route",
        data: {
          hasError: true,
          errorMessage: error.message,
        },
        timestamp: Date.now(),
        hypothesisId: "S2",
      }),
    }).catch(() => {});
    // #endregion
    return NextResponse.redirect(errorPathWithReason(error.message || "Verification failed"));
  }

  if (!data?.session) {
    console.error("[set-password] verifyOtp ok but no session in response");
    // #region agent log
    fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d1a7bb" },
      body: JSON.stringify({
        sessionId: "d1a7bb",
        runId: "repro-1",
        location: "app/api/auth/set-password/route.ts:noSession",
        message: "verifyOtp returned no session",
        data: {},
        timestamp: Date.now(),
        hypothesisId: "S3",
      }),
    }).catch(() => {});
    // #endregion
    return NextResponse.redirect(errorPathWithReason("No session returned"));
  }

  const { error: setError } = await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
  if (setError) {
    console.error("[set-password] setSession failed:", setError.message);
    // #region agent log
    fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d1a7bb" },
      body: JSON.stringify({
        sessionId: "d1a7bb",
        runId: "repro-1",
        location: "app/api/auth/set-password/route.ts:setSessionError",
        message: "setSession failed in set-password route",
        data: {
          hasError: true,
          errorMessage: setError.message,
        },
        timestamp: Date.now(),
        hypothesisId: "S4",
      }),
    }).catch(() => {});
    // #endregion
    return NextResponse.redirect(errorPathWithReason(setError.message || "Session setup failed"));
  }

  // #region agent log
  fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d1a7bb" },
    body: JSON.stringify({
      sessionId: "d1a7bb",
      runId: "repro-1",
      location: "app/api/auth/set-password/route.ts:success",
      message: "set-password verifyOtp + setSession success, redirecting to reset-password",
      data: {},
      timestamp: Date.now(),
      hypothesisId: "S5",
    }),
  }).catch(() => {});
  // #endregion

  const response = NextResponse.redirect(resetPath, { status: 302 });
  for (const { name, value, options } of cookiesToSet) {
    response.cookies.set(name, value, (options ?? {}) as Parameters<typeof response.cookies.set>[2]);
  }
  return response;
}
