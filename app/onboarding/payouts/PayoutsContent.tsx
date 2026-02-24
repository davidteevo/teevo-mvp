"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CreditCard } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function PayoutsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const isNew = searchParams.get("new") === "1";
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [payoutsEnabled, setPayoutsEnabled] = useState<boolean | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent("/onboarding/payouts")}`);
      return;
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch("/api/onboarding/status")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setPayoutsEnabled(data.payoutsEnabled === true);
        if (data.payoutsEnabled === true) {
          router.replace("/dashboard");
          return;
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, router]);

  const startStripeOnboarding = async () => {
    setError("");
    setRedirecting(true);
    try {
      const res = await fetch("/api/onboarding/stripe-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/dashboard?stripe=return`,
          refreshUrl: `${window.location.origin}/onboarding/payouts?stripe=refresh`,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
        return;
      }
      setError(data.error ?? "Could not start onboarding");
    } catch {
      setError("Something went wrong");
    } finally {
      setRedirecting(false);
    }
  };

  if (authLoading || loading || payoutsEnabled === true) {
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
            <CreditCard className="h-10 w-10 text-mowing-green" />
          </div>
        </div>
        <h1 className="mt-4 text-xl font-bold text-mowing-green text-center">
          {isNew ? "Enable payouts to sell" : "Complete payouts setup"}
        </h1>
        <p className="mt-2 text-mowing-green/80 text-sm text-center">
          Connect your bank details with Stripe so we can pay you when your items sell. Takes about 2 minutes and is secure.
        </p>
        {error && (
          <p className="mt-3 text-sm text-divot-pink text-center" role="alert">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={startStripeOnboarding}
            disabled={redirecting}
            className="w-full rounded-xl bg-mowing-green text-off-white-pique py-3 font-semibold hover:opacity-90 disabled:opacity-70 transition-opacity"
          >
            {redirecting ? "Opening…" : "Enable payouts (2 min)"}
          </button>
          <Link
            href="/dashboard"
            className="block text-center text-sm text-mowing-green/80 hover:text-mowing-green"
          >
            Skip for now
          </Link>
        </div>
        <p className="mt-4 text-xs text-mowing-green/60 text-center">
          You can list items anytime. You’ll need to complete this before you can receive payments.
        </p>
      </div>
    </div>
  );
}
