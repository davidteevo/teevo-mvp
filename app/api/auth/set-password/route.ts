import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;

/**
 * Recovery: (1) Non-PKCE token_hash → verifyOtp on server + set cookies.
 * (2) PKCE tokens (prefix `pkce_`) → redirect to Supabase /auth/v1/verify so the
 * browser completes code exchange (same browser as resetPasswordForEmail required).
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
    return NextResponse.redirect(errorPathWithReason("Missing link token"));
  }

  /** PKCE recovery: server verifyOtp cannot complete without code_verifier; use Supabase verify → code → callback. */
  if (token_hash.startsWith("pkce_")) {
    // #region agent log
    fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d1a7bb" },
      body: JSON.stringify({
        sessionId: "d1a7bb",
        runId: "set-password",
        hypothesisId: "SPK1",
        location: "app/api/auth/set-password/route.ts:pkcePage",
        message: "Serving PKCE continue page",
        data: {},
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
    if (!supabaseUrl) {
      return NextResponse.redirect(errorPathWithReason("Server misconfiguration"));
    }
    const redirectTo = `${base}/login/reset-password`;
    const verifyUrl = `${supabaseUrl}/auth/v1/verify?token=${encodeURIComponent(token_hash)}&type=${encodeURIComponent("recovery")}&redirect_to=${encodeURIComponent(redirectTo)}`;
    // Avoid auto-redirect: email security scanners often prefetch links and would consume the one-time token.
    // Only a real user click should initiate the Supabase verify request.
    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex,nofollow" />
    <title>Continue password reset</title>
    <style>
      body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;max-width:560px;margin:40px auto;padding:0 16px;color:#0b3d2e}
      h1{font-size:22px;margin:0 0 8px}
      p{line-height:1.45;margin:10px 0;color:#0b3d2ecc}
      button{background:#0b3d2e;color:#fff;border:0;border-radius:12px;padding:12px 16px;font-weight:700;cursor:pointer}
      button:disabled{opacity:.6;cursor:not-allowed}
      .small{font-size:12px;color:#0b3d2e99;margin-top:14px}
      code{background:rgba(11,61,46,.08);padding:2px 6px;border-radius:8px}
    </style>
  </head>
  <body>
    <h1>Continue password reset</h1>
    <p>To protect you, we only continue when you confirm. This prevents email scanners from consuming one-time links.</p>
    <button id="continue">Continue</button>
    <p class="small">If this doesn’t work, request a new reset email and open it in the same browser/device where you requested it.</p>
    <script>
      (function(){
        var btn = document.getElementById('continue');
        btn.addEventListener('click', function(){
          btn.disabled = true;
          window.location.href = ${JSON.stringify(verifyUrl)};
        });
      })();
    </script>
  </body>
</html>`;
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
      },
    });
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
    // #region agent log
    fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d1a7bb" },
      body: JSON.stringify({
        sessionId: "d1a7bb",
        runId: "set-password",
        hypothesisId: "S2",
        location: "app/api/auth/set-password/route.ts:verifyOtpError",
        message: "verifyOtp failed in set-password route",
        data: { errorMessage: error.message },
        timestamp: Date.now(),
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
        runId: "set-password",
        hypothesisId: "S3",
        location: "app/api/auth/set-password/route.ts:noSession",
        message: "verifyOtp returned no session",
        data: {},
        timestamp: Date.now(),
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
        runId: "set-password",
        hypothesisId: "S4",
        location: "app/api/auth/set-password/route.ts:setSessionError",
        message: "setSession failed in set-password route",
        data: { errorMessage: setError.message },
        timestamp: Date.now(),
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
      runId: "set-password",
      hypothesisId: "S5",
      location: "app/api/auth/set-password/route.ts:success",
      message: "set-password verifyOtp + setSession success",
      data: {},
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  const response = NextResponse.redirect(resetPath, { status: 302 });
  for (const { name, value, options } of cookiesToSet) {
    response.cookies.set(name, value, (options ?? {}) as Parameters<typeof response.cookies.set>[2]);
  }
  return response;
}
