"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { UserRound } from "lucide-react";

function WelcomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, refreshProfile } = useAuth();
  const nextPath = searchParams.get("next") ?? "/onboarding/payouts";
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent("/onboarding/welcome" + (searchParams.toString() ? "?" + searchParams.toString() : ""))}`);
    }
  }, [user, authLoading, router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const first = firstName.trim();
    if (!first) {
      setError("Please enter your first name.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: first,
          surname: surname.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        await refreshProfile();
        router.replace(nextPath);
        return;
      }
      setError(data.error ?? "Something went wrong");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center text-mowing-green/80">
        <div className="h-10 w-10 rounded-full border-2 border-mowing-green/20 border-t-mowing-green animate-spin mx-auto" />
        <p className="mt-4">Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="rounded-2xl border border-par-3-punch/30 bg-white p-6 shadow-sm">
        <div className="flex justify-center">
          <div className="rounded-full bg-golden-tee/20 p-4">
            <UserRound className="h-10 w-10 text-mowing-green" />
          </div>
        </div>
        <h1 className="mt-4 text-xl font-bold text-mowing-green text-center">
          Welcome to Teevo
        </h1>
        <p className="mt-2 text-mowing-green/80 text-sm text-center">
          Tell us your name so we can personalise your experience and set up your seller profile.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <p className="text-sm text-divot-pink text-center" role="alert">
              {error}
            </p>
          )}
          <div>
            <label htmlFor="welcome-first_name" className="block text-sm font-medium text-mowing-green mb-1">
              First name <span className="text-divot-pink">*</span>
            </label>
            <input
              id="welcome-first_name"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g. Alex"
              required
              autoFocus
              className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green placeholder:text-mowing-green/50"
            />
          </div>
          <div>
            <label htmlFor="welcome-surname" className="block text-sm font-medium text-mowing-green mb-1">
              Surname <span className="text-mowing-green/60">(optional)</span>
            </label>
            <input
              id="welcome-surname"
              type="text"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              placeholder="e.g. Smith"
              className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green placeholder:text-mowing-green/50"
            />
          </div>
          <p className="text-xs text-mowing-green/60">
            Buyers will see a generated name (e.g. Alex 4821) instead of your real name, so you can sell safely on the platform.
          </p>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-mowing-green text-off-white-pique py-3 font-semibold hover:opacity-90 disabled:opacity-70 transition-opacity"
          >
            {saving ? "Saving…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function OnboardingWelcomePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto px-4 py-16 text-center text-mowing-green/80">
          <div className="h-10 w-10 rounded-full border-2 border-mowing-green/20 border-t-mowing-green animate-spin mx-auto" />
          <p className="mt-4">Loading…</p>
        </div>
      }
    >
      <WelcomeContent />
    </Suspense>
  );
}
