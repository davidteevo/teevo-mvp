"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Race a promise against a timeout so getSession() cannot hang the UI indefinitely. */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = window.setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        window.clearTimeout(id);
        resolve(value);
      },
      (err: unknown) => {
        window.clearTimeout(id);
        reject(err);
      }
    );
  });
}

function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const message = searchParams.get("message");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url?.startsWith("https://")) {
      setError("NEXT_PUBLIC_SUPABASE_URL is missing or invalid in .env.local. Add your Project URL from Supabase → Project Settings → API, then restart the dev server (Ctrl+C, then npm run dev).");
      return;
    }
    if (!key?.startsWith("eyJ")) {
      setError("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or invalid in .env.local. Add the anon public key from Supabase → Project Settings → API, then restart the dev server.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    let err: { message: string } | null = null;
    try {
      const result = await supabase.auth.signInWithPassword({ email, password });
      err = result.error;
    } catch (e) {
      err = { message: e instanceof Error ? e.message : "Network error" };
    }
    if (err) {
      setLoading(false);
      const lower = err.message.toLowerCase();
      let msg: string;
      if (lower.includes("rate") || lower.includes("rate limit") || lower.includes("too many requests")) {
        msg = "Too many sign-in attempts. Please wait a few minutes and try again. You can also increase auth rate limits in Supabase Dashboard → Authentication → Rate Limits.";
      } else if (lower.includes("fetch") || lower.includes("network")) {
        msg = `Could not reach the auth server at ${url}. Check your internet connection, that the URL is correct in .env.local, and that your Supabase project is not paused (Dashboard → Project Settings → General). Then restart the dev server.`;
      } else {
        msg = err.message;
      }
      setError(msg);
      return;
    }
    // Let Supabase SSR persist session to cookies before full-page redirect (avoids session missing on app.teevohq.com).
    // try/finally ensures loading never sticks if getSession throws or hangs; timeout avoids indefinite wait (e.g. stale cookies).
    try {
      await withTimeout(
        supabase.auth.getSession(),
        12_000,
        "Session sync timed out. Try clearing site data for this site or use Sign out, then log in again."
      );
      await new Promise((r) => setTimeout(r, 300));
      const safePath = redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/dashboard";
      const origin = window.location.origin;
      window.location.href = safePath.startsWith("http") ? safePath : `${origin}${safePath}`;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not finish signing in";
      const lower = msg.toLowerCase();
      const hint =
        lower.includes("timed out") || lower.includes("network") || lower.includes("fetch")
          ? " If this keeps happening, clear cookies and site data for this domain or visit /api/auth/signout then try again."
          : "";
      setError(`${msg}${hint}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-5 sm:px-6 py-12 relative">
      {loading && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-off-white-pique"
          aria-live="polite"
          role="status"
          aria-label="Signing you in"
        >
          <div className="flex flex-col items-center">
            <div className="relative h-14 w-14">
              <div className="absolute inset-0 rounded-full border-2 border-mowing-green/15" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-mowing-green border-r-mowing-green/40 animate-spin" style={{ animationDuration: "0.9s" }} />
            </div>
            <p className="mt-5 text-lg font-semibold text-mowing-green">Signing you in</p>
            <p className="mt-1.5 text-sm text-mowing-green/60">Taking you to your dashboard…</p>
          </div>
        </div>
      )}
      <h1 className="text-2xl font-bold text-mowing-green">Log in</h1>
      <p className="mt-2 text-mowing-green/80 text-sm">
        Welcome back. Log in to sell or buy.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {message === "password-updated" && (
          <p className="text-sm text-mowing-green bg-mowing-green/10 rounded-lg px-3 py-2" role="status">
            Password updated. You can log in with your new password.
          </p>
        )}
        {error && (
          <p className="text-sm text-divot-pink" role="alert">
            {error}
          </p>
        )}
        <div>
          <label className="block text-sm font-medium text-mowing-green mb-1">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="w-full min-h-[48px] rounded-xl border border-mowing-green/30 bg-white px-4 py-3 text-base text-mowing-green placeholder:text-mowing-green/50 disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-mowing-green">
              Password
            </label>
            <Link
              href={`/login/forgot-password?redirect=${encodeURIComponent(redirect)}`}
              className="text-sm text-par-3-punch hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="w-full min-h-[48px] rounded-xl border border-mowing-green/30 bg-white px-4 py-3 text-base text-mowing-green placeholder:text-mowing-green/50 disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-mowing-green text-off-white-pique py-3 font-semibold hover:opacity-90 disabled:opacity-70 transition-opacity"
        >
          Log in
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-mowing-green/80">
        No account?{" "}
        <Link href={`/signup?redirect=${encodeURIComponent(redirect)}`} className="text-par-3-punch hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md mx-auto px-5 sm:px-6 py-12 text-center text-mowing-green/80">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
