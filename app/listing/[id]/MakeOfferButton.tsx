"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

const BUYING_ENABLED = process.env.NEXT_PUBLIC_BUYING_ENABLED !== "false";

/** Suggested offer amounts: 90%, 95%, and list price (rounded to whole pounds). */
function suggestedAmountsPence(listingPricePence: number): number[] {
  const a = Math.round((listingPricePence * 0.9) / 100) * 100;
  const b = Math.round((listingPricePence * 0.95) / 100) * 100;
  const c = Math.round(listingPricePence / 100) * 100;
  const set = new Set([a, b, c].filter((p) => p > 0));
  return Array.from(set).sort((x, y) => x - y).slice(-3);
}

export function MakeOfferButton({
  listingId,
  listingPricePence,
}: {
  listingId: string;
  listingPricePence: number;
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const openConversation = async (amountPence?: number) => {
    if (!user) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error ?? "Something went wrong");
        return;
      }
      const conversationId = data.conversation?.id;
      if (!conversationId) {
        alert("Could not open conversation");
        return;
      }
      if (amountPence != null && amountPence > 0) {
        const offerRes = await fetch(`/api/conversations/${conversationId}/offers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amountPence }),
        });
        if (!offerRes.ok) {
          const offerData = await offerRes.json().catch(() => ({}));
          alert(offerData.error ?? "Offer could not be created");
        }
      }
      window.location.href = `/conversations/${conversationId}`;
    } catch {
      alert("Something went wrong");
    } finally {
      setLoading(false);
      setModalOpen(false);
    }
  };

  const suggested = suggestedAmountsPence(listingPricePence);

  const handleClick = () => {
    if (!user) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    if (!BUYING_ENABLED) {
      openConversation();
      return;
    }
    setModalOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full sm:w-auto rounded-xl border-2 border-mowing-green text-mowing-green px-8 py-4 text-lg font-semibold hover:bg-mowing-green/10 disabled:opacity-70"
      >
        {loading ? "Opening…" : BUYING_ENABLED ? "Make offer / Ask seller" : "Ask seller"}
      </button>
      {modalOpen && BUYING_ENABLED && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => !loading && setModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="make-offer-modal-title"
        >
          <div
            className="rounded-2xl bg-white shadow-xl max-w-md w-full p-6 text-mowing-green"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="make-offer-modal-title" className="text-xl font-bold mb-2">
              Make an offer
            </h2>
            <p className="text-mowing-green/80 text-sm mb-4">
              Choose a suggested amount or open the chat to ask a question.
            </p>
            <div className="space-y-2">
              {suggested.map((pence) => (
                <button
                  key={pence}
                  type="button"
                  disabled={loading}
                  onClick={() => openConversation(pence)}
                  className="w-full rounded-xl border-2 border-mowing-green text-mowing-green px-4 py-3 font-semibold hover:bg-mowing-green/10 disabled:opacity-70"
                >
                  Offer £{(pence / 100).toFixed(2)}
                </button>
              ))}
              <button
                type="button"
                disabled={loading}
                onClick={() => openConversation()}
                className="w-full rounded-xl border border-mowing-green/50 text-mowing-green px-4 py-3 font-medium hover:bg-mowing-green/5 disabled:opacity-70"
              >
                Ask a question (no offer yet)
              </button>
            </div>
            <button
              type="button"
              onClick={() => !loading && setModalOpen(false)}
              className="mt-4 w-full text-sm text-mowing-green/70 hover:text-mowing-green"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
