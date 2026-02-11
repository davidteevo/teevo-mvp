"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { CreditCard } from "lucide-react";

export function OnboardingStripeBanner({ className = "" }: { className?: string }) {
  const { profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  if (profile?.stripe_account_id) return null;

  const startOnboarding = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/stripe-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/dashboard?stripe=return`,
          refreshUrl: `${window.location.origin}/dashboard?stripe=refresh`,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error ?? "Could not start onboarding");
    } catch {
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`rounded-xl border border-golden-tee/50 bg-golden-tee/10 p-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <CreditCard className="h-5 w-5 text-mowing-green shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-mowing-green">Set up payouts to sell</p>
            <p className="text-sm text-mowing-green/80 mt-0.5">
              Connect your Stripe account so we can pay you when your items sell. Quick and secure.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={startOnboarding}
          disabled={loading}
          className="shrink-0 rounded-lg bg-mowing-green text-off-white-pique px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-70"
        >
          {loading ? "Redirecting…" : "Connect Stripe"}
        </button>
      </div>
    </div>
  );
}
