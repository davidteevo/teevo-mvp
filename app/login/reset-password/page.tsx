"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recoveryReady, setRecoveryReady] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    // Supabase puts access_token and type=recovery in the URL hash; the client recovers the session when we call getSession
    supabase.auth.getSession().then(({ data: { session } }) => {
      const isRecovery = session?.user?.recovery_token != null || typeof window !== "undefined" && /type=recovery/.test(window.location.hash);
      setRecoveryReady(isRecovery || !!session);
    });
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
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.replace("/login?message=password-updated");
  };

  if (recoveryReady === null) {
    return (
      <div className="max-w-sm mx-auto px-4 py-12 text-center text-mowing-green/80">
        Loading…
      </div>
    );
  }

  if (recoveryReady === false) {
    return (
      <div className="max-w-sm mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-mowing-green">Invalid or expired link</h1>
        <p className="mt-2 text-mowing-green/80 text-sm">
          This reset link is invalid or has expired. Request a new one from the login page.
        </p>
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
