"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const DEFAULT_NEXT = "/onboarding/welcome?new=1";

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

function sbCookieNames(): string[] {
  if (typeof document === "undefined") return [];
  return document.cookie
    .split(";")
    .map((c) => c.trim().split("=")[0])
    .filter((n) => n.startsWith("sb-"));
}

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return DEFAULT_NEXT;
  return raw;
}

async function clearAuthCookies() {
  try {
    await fetch("/api/auth/clear-session-cookies", { method: "POST", credentials: "include" });
    const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
    for (const name of sbCookieNames()) {
      document.cookie = `${name}=; Max-Age=0; path=/`;
      if (domain) document.cookie = `${name}=; Max-Age=0; path=/; domain=${domain}`;
    }
  } catch {
    // proceed even if clear fails
  }
}

function ConfirmEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenHash = searchParams.get("token_hash") ?? searchParams.get("token");
  const alreadyConfirmed = searchParams.get("confirmed") === "1";
  const next = useMemo(() => safeNext(searchParams.get("next")), [searchParams]);

  const [step, setStep] = useState<"confirm" | "verified" | "error">(
    alreadyConfirmed ? "verified" : "confirm"
  );
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (!tokenHash) {
      setStep("error");
      setError("This confirmation link is missing a token.");
      return;
    }
    setError("");
    setVerifying(true);
    if (tokenHash.startsWith("pkce_")) {
      const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
      if (!supabaseUrl) {
        setStep("error");
        setError("Sign-in is not configured.");
        setVerifying(false);
        return;
      }
      const redirectTo = `${window.location.origin}/login?message=email-confirmed&redirect=${encodeURIComponent(next)}`;
      window.location.href = `${supabaseUrl}/auth/v1/verify?token=${encodeURIComponent(tokenHash)}&type=signup&redirect_to=${encodeURIComponent(redirectTo)}`;
      return;
    }
    const supabase = createClient();
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        type: "signup",
        token_hash: tokenHash,
      });
      if (verifyError) {
        setStep("error");
        setError(verifyError.message);
        return;
      }
      const confirmedEmail = data.user?.email?.trim() || email;
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // still continue to the confirmed + login state
      }
      await clearAuthCookies();
      setEmail(confirmedEmail);
      setStep("verified");
      const params = new URLSearchParams();
      params.set("confirmed", "1");
      if (confirmedEmail) params.set("email", confirmedEmail);
      if (next !== DEFAULT_NEXT) params.set("next", next);
      router.replace(`/auth/confirm-email?${params.toString()}`);
    } catch (e) {
      setStep("error");
      setError(e instanceof Error ? e.message : "Could not confirm your email.");
    } finally {
      setVerifying(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url?.startsWith("https://")) {
      setError("Sign-in is not configured. Please try again later.");
      return;
    }
    if (!key?.startsWith("eyJ")) {
      setError("Sign-in is not configured. Please try again later.");
      return;
    }
    setSigningIn(true);
    await clearAuthCookies();

    const supabase = createClient();
    let err: { message: string } | null = null;
    try {
      const result = await supabase.auth.signInWithPassword({ email, password });
      err = result.error;
    } catch (caught) {
      err = { message: caught instanceof Error ? caught.message : "Network error" };
    }
    if (err) {
      setSigningIn(false);
      const lower = err.message.toLowerCase();
      if (lower.includes("rate") || lower.includes("too many requests")) {
        setError("Too many sign-in attempts. Please wait a few minutes and try again.");
      } else if (lower.includes("fetch") || lower.includes("network")) {
        setError("Could not reach the sign-in server. Check your connection and try again.");
      } else {
        setError(err.message);
      }
      return;
    }
    try {
      await withTimeout(
        supabase.auth.getSession(),
        12_000,
        "Session sync timed out. Try clearing site data for this site, then log in again."
      );
      await new Promise((r) => setTimeout(r, 300));
      const origin = window.location.origin;
      window.location.href = next.startsWith("http") ? next : `${origin}${next}`;
    } catch (caught) {
      const msg = caught instanceof Error ? caught.message : "Could not finish signing in";
      setError(msg);
      setSigningIn(false);
    }
  };

  if (step === "error" || (!tokenHash && !alreadyConfirmed)) {
    return (
      <div className="w-full max-w-md mx-auto px-5 sm:px-6 py-12 text-center">
        <div className="rounded-2xl bg-white border border-mowing-green/15 p-8">
          <h1 className="text-xl font-bold text-mowing-green">This link isn’t valid</h1>
          <p className="mt-2 text-mowing-green/80 text-sm leading-relaxed">
            It may have expired or already been used. If you’ve already confirmed your email, you can log in with the password you chose when you signed up.
          </p>
          {error && !error.toLowerCase().includes("missing") && (
            <p className="mt-3 text-xs text-mowing-green/50">{error}</p>
          )}
        </div>
        <p className="mt-6 text-sm text-mowing-green/80">
          <Link href="/login" className="text-par-3-punch font-medium hover:underline">
            Log in
          </Link>
          {" · "}
          <Link href="/signup" className="text-par-3-punch font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    );
  }

  if (step === "verified") {
    return (
      <div className="w-full max-w-md mx-auto px-5 sm:px-6 py-12 relative">
        {signingIn && (
          <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-off-white-pique"
            aria-live="polite"
            role="status"
            aria-label="Signing you in"
          >
            <div className="flex flex-col items-center">
              <div className="relative h-14 w-14">
                <div className="absolute inset-0 rounded-full border-2 border-mowing-green/15" />
                <div
                  className="absolute inset-0 rounded-full border-2 border-transparent border-t-mowing-green border-r-mowing-green/40 animate-spin"
                  style={{ animationDuration: "0.9s" }}
                />
              </div>
              <p className="mt-5 text-lg font-semibold text-mowing-green">Signing you in</p>
              <p className="mt-1.5 text-sm text-mowing-green/60">Taking you to Teevo…</p>
            </div>
          </div>
        )}
        <div className="text-center">
          <CheckCircle className="mx-auto h-14 w-14 text-par-3-punch" aria-hidden />
          <h1 className="mt-4 text-2xl font-bold text-mowing-green">Your email has been confirmed</h1>
          <p className="mt-2 text-mowing-green/80 text-sm">
            Enter the password you chose when you signed up to log in.
          </p>
        </div>
        <form onSubmit={handleSignIn} className="mt-8 space-y-4">
          {error && (
            <p className="text-sm text-divot-pink" role="alert">
              {error}
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-mowing-green mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={signingIn}
              autoComplete="email"
              className="w-full min-h-[48px] rounded-xl border border-mowing-green/30 bg-white px-4 py-3 text-base text-mowing-green placeholder:text-mowing-green/50 disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-mowing-green">Password</label>
              <Link
                href={`/login/forgot-password?redirect=${encodeURIComponent(next)}`}
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
              disabled={signingIn}
              autoComplete="current-password"
              autoFocus
              className="w-full min-h-[48px] rounded-xl border border-mowing-green/30 bg-white px-4 py-3 text-base text-mowing-green placeholder:text-mowing-green/50 disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation"
            />
          </div>
          <button
            type="submit"
            disabled={signingIn}
            className="w-full rounded-xl bg-mowing-green text-off-white-pique py-3 font-semibold hover:opacity-90 disabled:opacity-70 transition-opacity"
          >
            Log in
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto px-5 sm:px-6 py-12 text-center">
      <div className="rounded-2xl bg-par-3-punch/10 border border-par-3-punch/30 p-8">
        <div className="mx-auto w-14 h-14 rounded-full bg-golden-tee/20 flex items-center justify-center">
          <Mail className="w-7 h-7 text-mowing-green" aria-hidden />
        </div>
        <h1 className="mt-5 text-xl font-bold text-mowing-green">Confirm your email</h1>
        <p className="mt-2 text-mowing-green/90 text-sm leading-relaxed">
          Click the button below to confirm this email address for your Teevo account. We wait for this click so email scanners can’t use the link on their own.
        </p>
        {error && (
          <p className="mt-3 text-sm text-divot-pink" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={verifying}
          className="mt-6 w-full rounded-xl bg-mowing-green text-off-white-pique py-3 font-semibold hover:opacity-90 disabled:opacity-70 transition-opacity"
        >
          {verifying ? "Confirming…" : "Confirm email"}
        </button>
      </div>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md mx-auto px-5 sm:px-6 py-12 text-center text-mowing-green/80">
          Loading…
        </div>
      }
    >
      <ConfirmEmailContent />
    </Suspense>
  );
}
