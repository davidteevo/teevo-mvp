"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { track } from "@/lib/analytics";
import { ReferralPromptCard } from "@/components/referral/ReferralPromptCard";
import { purchaseItemNoun } from "@/lib/listing-categories";

type Tx = {
  id: string;
  listing_id: string;
  status: string;
  buyer_confirmed_at?: string | null;
  completed_at?: string | null;
  delivery_issue_reported_at?: string | null;
  listing?: { brand?: string; model?: string; title?: string | null; category?: string } | null;
};

function listingTitle(tx: Tx | null): string {
  if (!tx?.listing) return "your club";
  return (
    tx.listing.title?.trim() ||
    [tx.listing.brand, tx.listing.model].filter(Boolean).join(" ") ||
    "your club"
  );
}

export default function ConfirmDeliveryPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tx, setTx] = useState<Tx | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"ok" | "problem" | null>(null);
  const [done, setDone] = useState<"confirmed" | "problem" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [referralUrl, setReferralUrl] = useState<string | null>(null);
  const [discountPence, setDiscountPence] = useState(500);
  const [referrerRewardPence, setReferrerRewardPence] = useState(500);

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent(`/dashboard/purchases/${id}/confirm`)}`);
    }
  }, [user, loading, router, id]);

  useEffect(() => {
    if (!user || !id) return;
    fetch("/api/transactions?role=buyer")
      .then((r) => r.json())
      .then((data) => {
        const found = (data.transactions ?? []).find((t: Tx) => t.id === id) ?? null;
        if (!found) {
          setLoadError("Purchase not found");
          return;
        }
        setTx(found);
        if (found.delivery_issue_reported_at) setDone("problem");
        else if (found.status === "complete" || found.buyer_confirmed_at || found.completed_at) {
          setDone("confirmed");
        }
      })
      .catch(() => setLoadError("Could not load this purchase"));
  }, [user, id]);

  useEffect(() => {
    if (done !== "confirmed") return;
    fetch("/api/referral/me")
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.url === "string") setReferralUrl(data.url);
        if (typeof data.discountPence === "number") setDiscountPence(data.discountPence);
        if (typeof data.referrerRewardPence === "number") setReferrerRewardPence(data.referrerRewardPence);
      })
      .catch(() => {
        /* optional */
      });
  }, [done]);

  const confirmOk = async () => {
    if (!id) return;
    setSubmitting("ok");
    setActionError(null);
    try {
      const res = await fetch(`/api/transactions/${id}/confirm-receipt`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to confirm");
      track("buyer_delivery_confirmed", { entity_type: "transaction", entity_id: id });
      setDone("confirmed");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to confirm");
    } finally {
      setSubmitting(null);
    }
  };

  const reportProblem = async () => {
    if (!id) return;
    setSubmitting("problem");
    setActionError(null);
    try {
      const res = await fetch(`/api/transactions/${id}/report-delivery-issue`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to report issue");
      track("buyer_delivery_issue_selected", { entity_type: "transaction", entity_id: id });
      setDone("problem");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to report issue");
    } finally {
      setSubmitting(null);
    }
  };

  if (loading || !user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center text-mowing-green/80">Loading…</div>
    );
  }

  const title = listingTitle(tx);
  const itemNoun = purchaseItemNoun(tx?.listing?.category);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/dashboard/purchases" className="text-sm text-par-3-punch hover:underline">
        ← Purchases
      </Link>

      {loadError ? (
        <div className="mt-6 rounded-xl border border-divot-pink/40 bg-white p-6 text-mowing-green">
          {loadError}
        </div>
      ) : !tx ? (
        <div className="mt-6 rounded-xl border border-par-3-punch/20 bg-white p-6 animate-pulse h-40" />
      ) : done === "confirmed" ? (
        <div className="mt-6">
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-par-3-punch" aria-hidden />
            <div>
              <h1 className="text-xl font-bold text-mowing-green sm:text-2xl">
                Your {title} has arrived
              </h1>
              <p className="mt-1 text-sm text-mowing-green/80 sm:text-base">
                Nice choice. We hope you love your new {itemNoun}.
              </p>
              <Link href="/dashboard/purchases" className="mt-2 inline-block text-sm text-par-3-punch hover:underline">
                Back to purchases
              </Link>
            </div>
          </div>
          <ReferralPromptCard
            url={referralUrl}
            variant="buyer"
            discountPence={discountPence}
            referrerRewardPence={referrerRewardPence}
          />
        </div>
      ) : done === "problem" ? (
        <div className="mt-6 rounded-xl border border-golden-tee/40 bg-white p-6">
          <h1 className="text-2xl font-bold text-mowing-green">We&apos;ve paused completion</h1>
          <p className="mt-2 text-mowing-green/80">
            Thanks for letting us know. We won&apos;t complete this order until Teevo has reviewed it.
            Email us at{" "}
            <a href="mailto:hello@teevohq.com" className="text-par-3-punch hover:underline">
              hello@teevohq.com
            </a>{" "}
            with order <span className="font-mono">{id.slice(0, 8)}</span> and a short description of the
            issue.
          </p>
          <Link
            href="/dashboard/purchases"
            className="mt-4 inline-flex rounded-lg border border-par-3-punch/30 text-par-3-punch px-4 py-2 text-sm font-medium hover:bg-par-3-punch/10"
          >
            Back to purchases
          </Link>
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-par-3-punch/20 bg-white p-6">
          <h1 className="text-2xl font-bold text-mowing-green">Confirm delivery</h1>
          <p className="mt-2 text-mowing-green/80">
            Have you received your <span className="font-medium text-mowing-green">{title}</span> and is
            everything as expected?
          </p>
          {actionError && (
            <p className="mt-3 text-sm text-red-700" role="alert">
              {actionError}
            </p>
          )}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={confirmOk}
              disabled={!!submitting}
              className="rounded-lg bg-mowing-green text-off-white-pique px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-70"
            >
              {submitting === "ok" ? "Confirming…" : "Yes, everything's OK"}
            </button>
            <button
              type="button"
              onClick={reportProblem}
              disabled={!!submitting}
              className="rounded-lg border border-mowing-green/30 text-mowing-green px-4 py-2.5 text-sm font-medium hover:bg-mowing-green/5 disabled:opacity-70"
            >
              {submitting === "problem" ? "Sending…" : "There's a problem"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
