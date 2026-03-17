"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recoveryReady, setRecoveryReady] = useState<boolean | null>(null);
  const [hashError, setHashError] = useState<string | null>(null);
  /** Same client that had setSession called, so updateUser has the session in memory (avoids "Auth session missing" when cookies don't persist). */
  const sessionClientRef = useRef<SupabaseClient | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.slice(1);
    const search = window.location.search.startsWith("?") ? window.location.search.slice(1) : window.location.search;
    const params = new URLSearchParams(hash || search);
    const code = params.get("code");
    const hasTokens = params.get("access_token") && params.get("refresh_token");

    // PKCE: redirect first so server can exchange code (verifier in cookies). Do this before any async work.
    if (code && !hasTokens) {
      const base = window.location.origin;
      const next = encodeURIComponent("/login/reset-password");
      window.location.replace(`${base}/auth/callback?code=${encodeURIComponent(code)}&next=${next}`);
      return;
    }

    const supabase = createClient();
    const err = params.get("error");
    const errDesc = params.get("error_description");
    const tokenHash = params.get("token_hash");

    // If we arrived here directly with token_hash (e.g. from email link), send it to
    // the server API which will create the session and redirect back.
    if (tokenHash && !hash && !params.get("access_token") && !params.get("refresh_token")) {
      const base = window.location.origin;
      window.location.replace(`${base}/api/auth/set-password?token_hash=${encodeURIComponent(tokenHash)}`);
      return;
    }

    // If we already have a session, treat the link as valid regardless of error params.
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (session) {
          sessionClientRef.current = supabase;
          setRecoveryReady(true);
        }
      })
      .catch(() => {});

    // #region agent log
    const hashKeys = Array.from(params.keys());
    fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d1a7bb" },
      body: JSON.stringify({
        sessionId: "d1a7bb",
        runId: "pre-fix",
        location: "app/login/reset-password/page.tsx:landed",
        message: "Reset password page landed",
        data: {
          pathname: window.location.pathname,
          origin: window.location.origin,
          hasHash: hash.length > 0,
          hashKeys,
          error: err ?? null,
          error_description: errDesc ?? null,
          tokenHashPresent: !!tokenHash,
        },
        timestamp: Date.now(),
        hypothesisId: "H1",
      }),
    }).catch(() => {});
    // #endregion

    if (params.get("error") === "invalid_link" && !errDesc) {
      setHashError("Invalid or expired link.");
      setRecoveryReady(false);
      // #region agent log
      fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d1a7bb" },
        body: JSON.stringify({
          sessionId: "d1a7bb",
          runId: "pre-fix",
          location: "app/login/reset-password/page.tsx:invalidLink",
          message: "Reset password invalid link branch",
          data: {
            error: err ?? null,
            error_description: errDesc ?? null,
          },
          timestamp: Date.now(),
          hypothesisId: "H2",
        }),
      }).catch(() => {});
      // #endregion
      return;
    }

    if (!sessionClientRef.current && (err || errDesc)) {
      setHashError(errDesc || err || "Invalid or expired link.");
      setRecoveryReady(false);
      // #region agent log
      fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d1a7bb" },
        body: JSON.stringify({
          sessionId: "d1a7bb",
          runId: "pre-fix",
          location: "app/login/reset-password/page.tsx:hashError",
          message: "Hash error branch taken",
          data: {
            error: err ?? null,
            error_description: errDesc ?? null,
          },
          timestamp: Date.now(),
          hypothesisId: "H3",
        }),
      }).catch(() => {});
      // #endregion
      return;
    }

    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const type = params.get("type");
    const isRecoveryWithTokens = !!access_token && !!refresh_token;

    // #region agent log
    fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d1a7bb" },
      body: JSON.stringify({
        sessionId: "d1a7bb",
        runId: "pre-fix",
        location: "app/login/reset-password/page.tsx:recoveryCheck",
        message: "Recovery tokens check",
        data: {
          hasAccessToken: !!access_token,
          accessTokenLen: access_token?.length ?? 0,
          hasRefreshToken: !!refresh_token,
          type,
          isRecoveryWithTokens,
        },
        timestamp: Date.now(),
        hypothesisId: "H4",
      }),
    }).catch(() => {});
    // #endregion

    if (isRecoveryWithTokens) {
      if (hash && !search) {
        window.history.replaceState(null, "", window.location.pathname + "?" + hash);
      }
      let settled = false;
      const timeoutMs = 12000;
      const timeoutId = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        setHashError("Verification is taking too long. Please try again or request a new link.");
        setRecoveryReady(false);
      }, timeoutMs);
      supabase.auth
        .setSession({ access_token, refresh_token })
        .then(() => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeoutId);
          // #region agent log
          fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d1a7bb" },
            body: JSON.stringify({
              sessionId: "d1a7bb",
              runId: "pre-fix",
              location: "app/login/reset-password/page.tsx:setSessionThen",
              message: "setSession success",
              data: {},
              timestamp: Date.now(),
              hypothesisId: "H5",
            }),
          }).catch(() => {});
          // #endregion
          sessionClientRef.current = supabase;
          window.history.replaceState(null, "", window.location.pathname);
          setRecoveryReady(true);
        })
        .catch((e) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeoutId);
          // #region agent log
          fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d1a7bb" },
            body: JSON.stringify({
              sessionId: "d1a7bb",
              runId: "pre-fix",
              location: "app/login/reset-password/page.tsx:setSessionCatch",
              message: "setSession error",
              data: { errorMessage: (e as Error)?.message ?? String(e) },
              timestamp: Date.now(),
              hypothesisId: "H6",
            }),
          }).catch(() => {});
          // #endregion
          setHashError(e?.message ?? "Could not restore session from link.");
          setRecoveryReady(false);
        });
      return;
    }

    const hasRecoveryHash = /type=recovery/.test(window.location.hash) || /access_token=/.test(window.location.hash);
    function checkReady() {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setRecoveryReady(!!session || hasRecoveryHash);
      });
    }
    checkReady();
    const fallbackTimer = window.setTimeout(() => {
      setRecoveryReady((prev) => (prev === null ? false : prev));
    }, 8000);
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") checkReady();
    });
    if (hasRecoveryHash && !access_token) {
      const t = setTimeout(checkReady, 400);
      return () => {
        clearTimeout(t);
        clearTimeout(fallbackTimer);
        sub?.subscription?.unsubscribe();
      };
    }
    return () => {
      clearTimeout(fallbackTimer);
      sub?.subscription?.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const supabase = sessionClientRef.current ?? createClient();
    // #region agent log
    fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d1a7bb" },
      body: JSON.stringify({
        sessionId: "d1a7bb",
        runId: "pre-fix",
        location: "app/login/reset-password/page.tsx:handleSubmit:beforeUpdate",
        message: "Submitting password update",
        data: {
          passwordLength: password.length,
          hasSessionClient: !!sessionClientRef.current,
        },
        timestamp: Date.now(),
        hypothesisId: "H7",
      }),
    }).catch(() => {});
    // #endregion

    const { error: err } = await supabase.auth.updateUser({ password });

    // #region agent log
    fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d1a7bb" },
      body: JSON.stringify({
        sessionId: "d1a7bb",
        runId: "pre-fix",
        location: "app/login/reset-password/page.tsx:handleSubmit:afterUpdate",
        message: "Password update response",
        data: {
          hasError: !!err,
          errorMessage: err?.message ?? null,
        },
        timestamp: Date.now(),
        hypothesisId: "H8",
      }),
    }).catch(() => {});
    // #endregion

    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.replace("/login?message=password-updated");
  };

  if (recoveryReady === null) {
    const hasCodeInUrl =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("code");
    return (
      <div className="max-w-sm mx-auto px-4 py-12 text-center text-mowing-green/80">
        {hasCodeInUrl ? "Redirecting…" : "Loading…"}
      </div>
    );
  }

  if (recoveryReady === false) {
    return (
      <div className="max-w-sm mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-mowing-green">Invalid or expired link</h1>
        <p className="mt-2 text-mowing-green/80 text-sm">
          {hashError ?? "This reset link is invalid or has expired. Request a new one from the login page."}
        </p>
        {hashError && (
          <>
            <p className="mt-2 text-mowing-green/70 text-xs">
              <strong>Using the Send Email Hook?</strong> The reset link is set in <code className="bg-mowing-green/10 px-0.5 rounded">app/api/auth/send-email/route.ts</code>. For <code className="bg-mowing-green/10 px-0.5 rounded">recovery</code>, use <code className="bg-mowing-green/10 px-0.5 rounded">cta_link: buildRecoveryLink()</code>. Restart or redeploy, then request a new reset email. See <code className="bg-mowing-green/10 px-0.5 rounded">docs/SEND_EMAIL_HOOK_CHECKLIST.md</code>.
            </p>
            <p className="mt-1.5 text-mowing-green/60 text-xs">
              Not using the hook? Supabase → URL Configuration: set Site URL to your app. Email Templates → Reset Password: use the token_hash link (no {`{{ .ConfirmationURL }}`}). If the link in the email is still <code className="bg-mowing-green/10 px-0.5 rounded">supabase.co/auth/v1/verify</code>, use Resend via SMTP so the dashboard template is used, or test with built-in email.
            </p>
          </>
        )}
        <p className="mt-6">
          <Link href="/login/forgot-password" className="text-par-3-punch hover:underline text-sm">
            Forgot password
          </Link>
          {" · "}
          <Link href="/login" className="text-par-3-punch hover:underline text-sm">
            Log in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-mowing-green">Set new password</h1>
      <p className="mt-2 text-mowing-green/80 text-sm">
        Enter your new password below.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && (
          <p className="text-sm text-divot-pink" role="alert">
            {error}
          </p>
        )}
        <div>
          <label className="block text-sm font-medium text-mowing-green mb-1">
            New password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-mowing-green mb-1">
            Confirm password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={loading}
            className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-mowing-green text-off-white-pique py-3 font-semibold hover:opacity-90 disabled:opacity-70 transition-opacity"
        >
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
      <p className="mt-6">
        <Link href="/login" className="text-par-3-punch hover:underline text-sm">
          ← Back to log in
        </Link>
      </p>
    </div>
  );
}
