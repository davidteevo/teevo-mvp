"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mail } from "lucide-react";

function SignupForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);

  // If user already has a session (e.g. stale after sign out, or they clicked Sign up while logged in), clear it so signup creates a fresh account
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.href = `/api/auth/signout?redirect=${encodeURIComponent("/signup" + (searchParams.toString() ? "?" + searchParams.toString() : ""))}`;
      }
    });
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
    });
    if (err) {
      const lower = err.message.toLowerCase();
      setError(
        lower.includes("rate") || lower.includes("rate limit") || lower.includes("too many requests")
          ? "Too many sign-up attempts. Please wait a few minutes and try again. You can increase auth rate limits in Supabase Dashboard → Authentication → Rate Limits."
          : err.message
      );
      setLoading(false);
      return;
    }
    setLoading(false);
    if (data?.user?.identities?.length === 0) {
      setError("An account with this email already exists. Try logging in instead.");
      await supabase.auth.signOut({ scope: "local" });
      return;
    }
    setEmailVerificationSent(true);
  };

  if (emailVerificationSent) {
    return (
      <div className="max-w-sm mx-auto px-4 py-12 text-center">
        <div className="rounded-2xl bg-par-3-punch/10 border border-par-3-punch/30 p-8">
          <div className="mx-auto w-14 h-14 rounded-full bg-golden-tee/20 flex items-center justify-center">
            <Mail className="w-7 h-7 text-mowing-green" aria-hidden />
          </div>
          <h1 className="mt-5 text-xl font-bold text-mowing-green">
            Check your inbox
          </h1>
          <p className="mt-2 text-mowing-green/90 text-sm leading-relaxed">
            We’ve sent a link to <strong>{email}</strong>. Click it to verify your email and you’re in — then you can list clubs, browse, and get back to the fairway.
          </p>
          <p className="mt-4 text-mowing-green/70 text-xs">
            No email? Check spam, or wait a minute and try again.
          </p>
        </div>
        <p className="mt-6">
          <Link href="/login" className="text-par-3-punch font-medium hover:underline text-sm">
            Back to log in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-12 relative">
      {loading && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-off-white-pique/95 backdrop-blur-sm"
          aria-live="polite"
          role="status"
          aria-label="Setting up your account"
        >
          <div
            className="h-12 w-12 rounded-full border-2 border-mowing-green/20 border-t-mowing-green animate-spin"
          />
          <p className="mt-4 text-mowing-green font-semibold">Setting up your account</p>
          <p className="mt-1 text-sm text-mowing-green/70">Please wait a moment…</p>
        </div>
      )}
      <h1 className="text-2xl font-bold text-mowing-green">Sign up</h1>
      <p className="mt-2 text-mowing-green/80 text-sm">
        Create an account to list items or buy.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
            className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-mowing-green mb-1">
            Password
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
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-mowing-green text-off-white-pique py-3 font-semibold hover:opacity-90 disabled:opacity-70 transition-opacity"
        >
          Sign up
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-mowing-green/80">
        Already have an account?{" "}
        <Link href={`/login?redirect=${encodeURIComponent(redirect)}`} className="text-par-3-punch hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="max-w-sm mx-auto px-4 py-12 text-center text-mowing-green/80">Loading…</div>}>
      <SignupForm />
    </Suspense>
  );
}
