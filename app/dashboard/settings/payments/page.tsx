"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { CreditCard, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function SettingsPaymentsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent("/dashboard/settings/payments")}`);
    }
  }, [user, authLoading, router]);

  const openStripeDashboard = async () => {
    setError("");
    setOpening(true);
    try {
      // #region agent log
      fetch("http://127.0.0.1:7581/ingest/4c9de01a-e4bd-4cc4-acce-f5ab7832ce40", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "da8230" },
        body: JSON.stringify({
          sessionId: "da8230",
          runId: "pre-fix",
          hypothesisId: "H6",
          location: "app/dashboard/settings/payments/page.tsx:25",
          message: "stripe_manage_button_invoked",
          data: { hasUser: Boolean(user), hasProfileStripeId: Boolean(profile?.stripe_account_id) },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      const res = await fetch("/api/user/stripe-login-link", { method: "POST" });
      const data = await res.json();
      // #region agent log
      fetch("http://127.0.0.1:7581/ingest/4c9de01a-e4bd-4cc4-acce-f5ab7832ce40", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "da8230" },
        body: JSON.stringify({
          sessionId: "da8230",
          runId: "pre-fix",
          hypothesisId: "H7",
          location: "app/dashboard/settings/payments/page.tsx:42",
          message: "stripe_manage_api_response",
          data: { status: res.status, ok: res.ok, hasUrl: Boolean(data?.url), hasError: Boolean(data?.error) },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      if (res.ok && data.url) {
        // #region agent log
        fetch("http://127.0.0.1:7581/ingest/4c9de01a-e4bd-4cc4-acce-f5ab7832ce40", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "da8230" },
          body: JSON.stringify({
            sessionId: "da8230",
            runId: "pre-fix",
            hypothesisId: "H8",
            location: "app/dashboard/settings/payments/page.tsx:57",
            message: "stripe_manage_window_opening",
            data: { target: "_blank", hasUrl: true },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        window.open(data.url, "_blank", "noopener,noreferrer");
        return;
      }
      setError(data.error ?? "Could not open Stripe");
    } catch {
      setError("Something went wrong");
    } finally {
      setOpening(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center text-mowing-green/80">
        Loading…
      </div>
    );
  }

  const hasStripeAccount = !!profile?.stripe_account_id;

  return (
    <div className="rounded-2xl border border-par-3-punch/20 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-mowing-green/10 p-3">
          <CreditCard className="h-6 w-6 text-mowing-green" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-mowing-green">Payments</h2>
          <p className="text-sm text-mowing-green/70">
            Bank details, payouts and tax information are managed securely by Stripe.
          </p>
        </div>
      </div>

      {hasStripeAccount ? (
        <div className="mt-6">
          <p className="text-sm text-mowing-green/80 mb-4">
            Update your bank account, view payouts, and manage tax details in your Stripe Express dashboard.
          </p>
          <button
            type="button"
            onClick={openStripeDashboard}
            disabled={opening}
            className="inline-flex items-center gap-2 rounded-xl bg-mowing-green text-off-white-pique px-5 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-70"
          >
            {opening ? "Opening…" : "Manage in Stripe"}
            <ExternalLink className="h-4 w-4" />
          </button>
          {error && (
            <p className="mt-3 text-sm text-divot-pink" role="alert">
              {error}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-par-3-punch/20 bg-mowing-green/5 p-4">
          <p className="text-sm text-mowing-green/80">
            You haven’t set up payouts yet. Complete the one-time setup to receive payments when you sell.
          </p>
          <Link
            href="/onboarding/payouts"
            className="mt-3 inline-block rounded-xl bg-mowing-green text-off-white-pique px-4 py-2 text-sm font-semibold hover:opacity-90"
          >
            Set up payouts
          </Link>
        </div>
      )}
    </div>
  );
}
