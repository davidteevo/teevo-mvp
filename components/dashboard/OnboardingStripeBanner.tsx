"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard } from "lucide-react";

export function OnboardingStripeBanner({ className = "" }: { className?: string }) {
  const [loading, setLoading] = useState(true);
  const [payoutsEnabled, setPayoutsEnabled] = useState<boolean | null>(null);
  const [buttonLoading, setButtonLoading] = useState(false);

  useEffect(() => {
    fetch("/api/onboarding/status")
      .then((r) => r.json())
      .then((data) => setPayoutsEnabled(data.payoutsEnabled === true))
      .catch(() => setPayoutsEnabled(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading || payoutsEnabled === true) return null;

  const startOnboarding = async () => {
    setButtonLoading(true);
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
      if (data.url) window.open(data.url, "_blank", "noopener,noreferrer");
      else alert(data.error ?? "Could not start onboarding");
    } catch {
      alert("Something went wrong");
    } finally {
      setButtonLoading(false);
    }
  };

  return (
    <div className={`rounded-xl border border-golden-tee/50 bg-golden-tee/10 p-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <CreditCard className="h-5 w-5 text-mowing-green shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-mowing-green">Complete payouts to receive money</p>
            <p className="text-sm text-mowing-green/80 mt-0.5">
              Finish connecting your bank details with Stripe so we can pay you when your items sell.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={startOnboarding}
            disabled={buttonLoading}
            className="rounded-lg bg-mowing-green text-off-white-pique px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-70"
          >
            {buttonLoading ? "Opening…" : "Complete setup"}
          </button>
          <Link
            href="/onboarding/payouts"
            className="rounded-lg border border-mowing-green/40 text-mowing-green px-4 py-2 text-sm font-medium hover:bg-mowing-green/5"
          >
            Details
          </Link>
        </div>
      </div>
    </div>
  );
}
