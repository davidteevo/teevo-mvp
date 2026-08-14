"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { track } from "@/lib/analytics";
import { StarRating } from "@/components/reviews/StarRating";
import { FEEDBACK_EVENTS, REVIEW_TEXT_MAX } from "@/lib/seller-reviews";

type FormData = {
  can_create: boolean;
  can_edit: boolean;
  seller: { id: string; display_name: string | null; avatar_url: string | null };
  listing: { id: string; title: string; image_url: string | null };
  existing: {
    id: string;
    rating: number;
    review_text: string | null;
    editable_until: string;
    status: string;
  } | null;
};

function parsePreselect(raw: string | null): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : 0;
}

export default function LeaveFeedbackPage() {
  return (
    <Suspense fallback={<div className="max-w-lg mx-auto px-4 py-12 text-center text-mowing-green/80">Loading…</div>}>
      <LeaveFeedbackContent />
    </Suspense>
  );
}

function LeaveFeedbackContent() {
  const params = useParams<{ transactionId: string }>();
  const transactionId = params?.transactionId;
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [form, setForm] = useState<FormData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [thanks, setThanks] = useState(false);

  const preselect = parsePreselect(searchParams.get("rating"));

  useEffect(() => {
    if (!loading && !user && transactionId) {
      const next = `/feedback/${transactionId}${preselect ? `?rating=${preselect}` : ""}`;
      router.replace(`/login?redirect=${encodeURIComponent(next)}`);
    }
  }, [loading, user, router, transactionId, preselect]);

  useEffect(() => {
    if (!user || !transactionId) return;
    fetch(`/api/seller-reviews/eligibility/${transactionId}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          setLoadError(typeof data.error === "string" ? data.error : "Could not load this purchase");
          return;
        }
        setForm(data);
        const existingRating = data.existing?.rating ?? 0;
        setRating(existingRating || preselect);
        setText(data.existing?.review_text ?? "");
        if (data.existing && !data.can_edit) setThanks(true);
        track(FEEDBACK_EVENTS.FORM_OPENED, {
          transaction_id: transactionId,
          preselected_rating: preselect || null,
        });
        if (preselect && !data.existing) {
          track(FEEDBACK_EVENTS.EMAIL_RATING_CLICKED, {
            transaction_id: transactionId,
            rating: preselect,
          });
        }
      })
      .catch(() => setLoadError("Could not load this purchase"));
  }, [user, transactionId, preselect]);

  async function submit() {
    if (!form || !transactionId) return;
    if (rating < 1) {
      setSubmitError("Please choose a star rating");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const isEdit = !!form.existing && form.can_edit;
      const res = await fetch(
        isEdit ? `/api/seller-reviews/${form.existing!.id}` : "/api/seller-reviews",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactionId,
            rating,
            reviewText: text.trim() || null,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(typeof data.error === "string" ? data.error : "Could not submit feedback");
        return;
      }
      setThanks(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center text-mowing-green/80">Loading…</div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <p className="text-divot-pink">{loadError}</p>
        <Link href="/dashboard/purchases" className="mt-4 inline-block text-sm text-par-3-punch hover:underline">
          Back to purchases
        </Link>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center text-mowing-green/80">Loading…</div>
    );
  }

  const sellerName = form.seller.display_name || "the seller";

  if (thanks) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="rounded-xl border border-par-3-punch/20 bg-white p-8 text-center">
          <h1 className="text-2xl font-bold text-mowing-green">Thanks for your feedback!</h1>
          <p className="mt-2 text-mowing-green/80">
            Your review of {sellerName} helps other golfers on Teevo.
          </p>
          <Link
            href={form.seller.id ? `/seller/${form.seller.id}` : "/dashboard/purchases"}
            className="mt-6 inline-block rounded-xl bg-mowing-green text-off-white-pique px-6 py-3 font-semibold hover:opacity-90"
          >
            View seller feedback
          </Link>
        </div>
      </div>
    );
  }

  if (!form.can_create && !form.can_edit) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <p className="text-mowing-green/80">Feedback isn&apos;t available for this purchase.</p>
        <Link href="/dashboard/purchases" className="mt-4 inline-block text-sm text-par-3-punch hover:underline">
          Back to purchases
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="rounded-xl border border-par-3-punch/20 bg-white p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <div className="relative h-14 w-14 shrink-0 rounded-full overflow-hidden bg-mowing-green/10">
            {form.seller.avatar_url ? (
              <Image src={form.seller.avatar_url} alt="" fill className="object-cover" sizes="56px" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-mowing-green">
                {sellerName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-mowing-green truncate">{sellerName}</p>
            <p className="text-sm text-mowing-green/70 truncate">{form.listing.title}</p>
          </div>
          <div className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden bg-mowing-green/10">
            <Image
              src={form.listing.image_url || "/placeholder-listing.svg"}
              alt=""
              fill
              className="object-cover"
              sizes="56px"
            />
          </div>
        </div>

        <h1 className="mt-6 text-xl font-bold text-mowing-green">
          How was your experience with {sellerName}?
        </h1>
        <div className="mt-4">
          <StarRating value={rating} onChange={setRating} label={`Rate ${sellerName}`} />
        </div>

        <label className="mt-6 block text-sm font-medium text-mowing-green" htmlFor="review-text">
          Tell others about your experience (optional)
        </label>
        <textarea
          id="review-text"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, REVIEW_TEXT_MAX))}
          rows={4}
          maxLength={REVIEW_TEXT_MAX}
          placeholder="Great seller — club arrived quickly and exactly as described."
          className="mt-2 w-full rounded-lg border border-par-3-punch/30 px-3 py-2 text-sm text-mowing-green"
        />
        <p className="mt-1 text-xs text-mowing-green/50 text-right">
          {text.length}/{REVIEW_TEXT_MAX}
        </p>

        {submitError && <p className="mt-3 text-sm text-divot-pink">{submitError}</p>}

        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="mt-6 w-full rounded-xl bg-mowing-green text-off-white-pique py-3 font-semibold hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit feedback"}
        </button>
      </div>
    </div>
  );
}
