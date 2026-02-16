"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signUp({ email, password });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    const syncRes = await fetch("/api/auth/sync-user", { method: "POST" });
    const syncData = await syncRes.json().catch(() => ({}));
    setLoading(false);
    router.push(syncData.isNewUser ? "/onboarding/payouts" : redirect);
    router.refresh();
  };

  const handleGoogle = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}` },
    });
    setLoading(false);
  };

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
      <div className="mt-4">
        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full rounded-xl border border-mowing-green/30 text-mowing-green py-3 font-medium hover:bg-mowing-green/5 disabled:opacity-70 transition-opacity"
        >
          Continue with Google
        </button>
      </div>
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
