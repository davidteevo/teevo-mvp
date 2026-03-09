"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { formatChatDisplayNameForUI } from "@/lib/chat-identity";

type Listing = {
  id: string;
  title: string;
  price: number;
  status: string;
  condition?: string | null;
  imageUrl: string | null;
};

type Message = {
  id: string;
  senderId: string | null;
  senderChatDisplayName: string | null;
  body: string | null;
  messageType: string;
  offerId: string | null;
  createdAt: string;
};

type Offer = {
  id: string;
  amount_pence: number;
  status: string;
  expires_at: string;
  counter_offer_id: string | null;
  created_at: string;
  buyer_id: string;
  seller_id: string;
  initiated_by?: "buyer" | "seller";
};

type Payload = {
  conversation: {
    id: string;
    listingId: string;
    buyerId: string;
    sellerId: string;
  };
  listing: Listing | null;
  sellerLocation?: string | null;
  otherPartyChatDisplayName: string;
  messages: Message[];
  offers: Offer[];
};

const POLL_INTERVAL_MS = 15000;

function formatMessageTimestamp(createdAt: string): string {
  const d = new Date(createdAt);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / 86400000);
  const timeStr = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  if (diffDays === 0) return `Today ${timeStr}`;
  if (diffDays === 1) return `Yesterday ${timeStr}`;
  if (diffDays < 7) return `${timeStr}`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " " + timeStr;
}

const OFF_PLATFORM_REGEX =
  /(\+?\d[\d\s-]{10,})|([\w.-]+@[\w.-]+\.\w+)|(instagram\.com|@[\w.]+\b.*insta|whatsapp|message me (off|outside)|text me at|call me at)/i;

function suggestsOffPlatformContact(text: string): boolean {
  return OFF_PLATFORM_REGEX.test(text);
}

function getSystemMessageDisplay(m: Message): string {
  if (m.body?.trim()) return m.body;
  switch (m.messageType) {
    case "offer":
      return "Offer sent";
    case "offer_accepted":
      return "Offer accepted. Complete checkout to secure the item.";
    case "offer_declined":
      return "Offer declined.";
    case "offer_countered":
      return "Counter offer sent.";
    case "offer_withdrawn":
      return "Offer withdrawn.";
    case "offer_expired":
      return "This offer has expired.";
    default:
      return m.messageType?.replace(/_/g, " ") ?? "System";
  }
}

export function ConversationDetail({ conversationId }: { conversationId: string }) {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [counterAmount, setCounterAmount] = useState("");
  const [sellerProposeAmount, setSellerProposeAmount] = useState("");
  const [sellerProposeLoading, setSellerProposeLoading] = useState(false);
  const [buyerOfferAmount, setBuyerOfferAmount] = useState("");
  const [buyerOfferLoading, setBuyerOfferLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollYBeforeFocusRef = useRef<number>(0);

  const fetchConversation = async () => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to load conversation");
        setPayload(null);
        return;
      }
      setPayload(data);
      setError(null);
    } catch {
      setError("Failed to load conversation");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversation();
    const t = setInterval(fetchConversation, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [conversationId]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
  }, [payload?.messages?.length]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = messageBody.trim();
    if (!body || sending) return;
    setSendError(null);
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSendError(data.error ?? "Failed to send");
        return;
      }
      setMessageBody("");
      await fetchConversation();
    } catch {
      setSendError("Failed to send");
    } finally {
      setSending(false);
    }
  };

  const offerAction = async (
    offerId: string,
    action: "accept" | "decline" | "withdraw",
    body?: { amountPence?: number }
  ) => {
    if (actionLoading) return;
    setActionLoading(offerId);
    try {
      const url =
        action === "accept"
          ? `/api/offers/${offerId}/accept`
          : action === "decline"
            ? `/api/offers/${offerId}/decline`
            : `/api/offers/${offerId}/withdraw`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error ?? "Action failed");
        return;
      }
      await fetchConversation();
    } catch {
      alert("Action failed");
    } finally {
      setActionLoading(null);
      setCounterAmount("");
    }
  };

  const handleCounter = async (offerId: string) => {
    const pence = Math.round(parseFloat(counterAmount) * 100);
    if (!Number.isInteger(pence) || pence <= 0) {
      alert("Enter a valid price in pounds");
      return;
    }
    if (actionLoading) return;
    setActionLoading(offerId);
    try {
      const res = await fetch(`/api/offers/${offerId}/counter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountPence: pence }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error ?? "Counter failed");
        return;
      }
      await fetchConversation();
      setCounterAmount("");
    } catch {
      alert("Counter failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBuyNow = async (offerId: string | null, amountPence: number) => {
    if (!payload?.listing?.id) return;
    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: payload.listing.id,
          ...(offerId && { acceptedOfferId: offerId }),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error ?? "Checkout failed");
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch {
      alert("Checkout failed");
    }
  };

  if (loading && !payload) {
    return (
      <p className="text-mowing-green/70 text-sm">Loading conversation…</p>
    );
  }
  if (error || !payload) {
    return (
      <div>
        <p className="text-red-600 text-sm" role="alert">
          {error ?? "Conversation not found"}
        </p>
        <Link href="/conversations" className="text-mowing-green underline mt-2 inline-block">
          Back to messages
        </Link>
      </div>
    );
  }

  const { conversation, listing, sellerLocation, otherPartyChatDisplayName, messages, offers } = payload;
  const acceptedOffer = offers.find((o) => o.status === "accepted");
  const pendingOffers = offers.filter((o) => o.status === "pending");
  const pendingFromSeller = pendingOffers.find(
    (o) => (o as Offer).initiated_by === "seller" || offers.some((x) => x.counter_offer_id === o.id)
  );
  const pendingFromBuyer = pendingOffers.find((o) => {
    const by = (o as Offer).initiated_by;
    return by === "buyer" || by == null;
  });
  const latestPendingFromBuyer = pendingFromBuyer;
  const latestPendingFromSeller = pendingFromSeller;
  const { user } = useAuth();
  const isCurrentUserBuyer = user?.id === conversation.buyerId;

  const sendOffer = async (amountPounds: string, setLoading: (v: boolean) => void, setAmount: (v: string) => void) => {
    const pence = Math.round(parseFloat(amountPounds) * 100);
    if (!Number.isInteger(pence) || pence <= 0 || !listing) return;
    if (pence > listing.price) {
      alert("Offer cannot exceed listing price");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountPence: pence }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error ?? "Failed to send offer");
        return;
      }
      setAmount("");
      await fetchConversation();
    } catch {
      alert("Failed to send offer");
    } finally {
      setLoading(false);
    }
  };

  const handleSellerPropose = () =>
    sendOffer(sellerProposeAmount, setSellerProposeLoading, setSellerProposeAmount);
  const handleBuyerMakeOffer = () =>
    sendOffer(buyerOfferAmount, setBuyerOfferLoading, setBuyerOfferAmount);

  const suggestedOfferPounds =
    listing && listing.price > 0
      ? [
          ((listing.price * 0.9) / 100).toFixed(2),
          ((listing.price * 0.95) / 100).toFixed(2),
          (listing.price / 100).toFixed(2),
        ]
      : [];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto">
        <div className="shrink-0 mb-2">
          <Link href="/conversations" className="text-sm text-mowing-green/70 hover:text-mowing-green">
            ← Back to messages
          </Link>
        </div>

        {listing && (
        <div className="sticky top-0 z-10 shrink-0 flex gap-3 p-3 rounded-xl border border-mowing-green/20 bg-mowing-green/5 mb-4 bg-off-white-pique/95 backdrop-blur-sm">
          <Link href={`/listing/${listing.id}`} className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-mowing-green/10">
            {listing.imageUrl ? (
              <Image src={listing.imageUrl} alt="" width={64} height={64} className="w-full h-full object-cover" />
            ) : (
              <span className="flex w-full h-full items-center justify-center text-mowing-green/50 text-xs">No image</span>
            )}
          </Link>
          <div className="min-w-0 flex-1 space-y-0.5">
            <Link href={`/listing/${listing.id}`} className="font-semibold text-mowing-green hover:underline truncate block text-base">
              {listing.title}
            </Link>
            <p className="text-mowing-green font-semibold">Listed for £{(listing.price / 100).toFixed(2)}</p>
            {listing.condition && (
              <p className="text-mowing-green/70 text-sm">Condition: {listing.condition}</p>
            )}
            {sellerLocation && (
              <p className="text-mowing-green/70 text-sm">Location: {sellerLocation}</p>
            )}
            {listing.status === "verified" && (
              <p className="text-mowing-green/60 text-xs">Verified listing</p>
            )}
          </div>
          <Link
            href={`/listing/${listing.id}`}
            className="shrink-0 self-center rounded-lg border border-mowing-green/40 text-mowing-green px-3 py-1.5 text-sm font-medium hover:bg-mowing-green/10"
          >
            View listing
          </Link>
        </div>
      )}

      <p className="text-sm text-mowing-green/70 mb-2">Chat with {formatChatDisplayNameForUI(otherPartyChatDisplayName)}</p>

      {/* Offer status line */}
      {!acceptedOffer && (latestPendingFromBuyer || latestPendingFromSeller) && (
        <p className="text-sm text-mowing-green/70 mb-2">
          {latestPendingFromSeller
            ? `Seller countered: £${(latestPendingFromSeller.amount_pence / 100).toFixed(2)}`
            : latestPendingFromBuyer && isCurrentUserBuyer
              ? `Active offer: £${(latestPendingFromBuyer.amount_pence / 100).toFixed(2)} — Waiting for seller response`
              : latestPendingFromBuyer
                ? `Buyer offered £${(latestPendingFromBuyer.amount_pence / 100).toFixed(2)}`
                : null}
        </p>
      )}
      {acceptedOffer && (
        <p className="text-sm text-mowing-green/80 font-medium mb-2">Accepted, ready to checkout</p>
      )}
      {!acceptedOffer && pendingOffers.length === 0 && offers.some((o) => o.status === "expired") && (
        <p className="text-sm text-mowing-green/60 mb-2">Offer expired</p>
      )}

      {/* Buy Now: always visible for buyer when listing verified (full price or accepted offer) */}
      {listing?.status === "verified" && isCurrentUserBuyer && (
        <div className="shrink-0 rounded-xl bg-mowing-green/15 border border-mowing-green/30 p-4 mb-4">
          <p className="text-mowing-green/70 text-xs mb-2">Payments protected on Teevo</p>
          {acceptedOffer ? (
            <>
              <p className="font-medium text-mowing-green mb-2">Offer accepted. Complete checkout to secure the item.</p>
              <button
                type="button"
                onClick={() => handleBuyNow(acceptedOffer.id, acceptedOffer.amount_pence)}
                className="rounded-xl bg-mowing-green text-off-white-pique px-6 py-3 font-semibold hover:opacity-90"
              >
                Buy for £{(acceptedOffer.amount_pence / 100).toFixed(2)}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => handleBuyNow(null, listing.price)}
              className="rounded-xl bg-mowing-green text-off-white-pique px-6 py-3 font-semibold hover:opacity-90 w-full sm:w-auto"
            >
              Buy for £{(listing.price / 100).toFixed(2)}
            </button>
          )}
        </div>
      )}

      {/* Offer CTAs: Seller sees Accept / Counter / Decline for buyer's pending; Buyer sees Withdraw for own pending, Accept/Counter/Withdraw for seller's counter */}
      {!acceptedOffer && latestPendingFromBuyer && isCurrentUserBuyer === false && (
        <div className="shrink-0 rounded-xl bg-mowing-green/10 border border-mowing-green/20 p-4 mb-4">
          <p className="text-sm font-medium text-mowing-green mb-3">
            Buyer offered £{(latestPendingFromBuyer.amount_pence / 100).toFixed(2)}
          </p>
          <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!!actionLoading}
            onClick={() => offerAction(latestPendingFromBuyer.id, "accept")}
            className="rounded-lg bg-mowing-green text-off-white-pique px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-70"
          >
            Accept
          </button>
          <button
            type="button"
            disabled={!!actionLoading}
            onClick={() => offerAction(latestPendingFromBuyer.id, "decline")}
            className="rounded-lg border border-mowing-green/50 text-mowing-green px-4 py-2 text-sm font-medium hover:bg-mowing-green/10 disabled:opacity-70"
          >
            Decline
          </button>
          <div className="inline-flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Counter £"
              value={counterAmount}
              onChange={(e) => setCounterAmount(e.target.value)}
              className="w-24 rounded border border-mowing-green/30 px-2 py-1.5 text-sm text-mowing-green"
            />
            <button
              type="button"
              disabled={!!actionLoading || !counterAmount}
              onClick={() => handleCounter(latestPendingFromBuyer.id)}
              className="rounded-lg border border-mowing-green/50 text-mowing-green px-4 py-2 text-sm font-medium hover:bg-mowing-green/10 disabled:opacity-70"
            >
              Counter
            </button>
          </div>
          </div>
        </div>
      )}
      {!acceptedOffer && latestPendingFromSeller && isCurrentUserBuyer === true && (
        <div className="shrink-0 flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            disabled={!!actionLoading}
            onClick={() => offerAction(latestPendingFromSeller.id, "accept")}
            className="rounded-lg bg-mowing-green text-off-white-pique px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-70"
          >
            Accept £{(latestPendingFromSeller.amount_pence / 100).toFixed(2)}
          </button>
          <div className="inline-flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Counter £"
              value={counterAmount}
              onChange={(e) => setCounterAmount(e.target.value)}
              className="w-24 rounded border border-mowing-green/30 px-2 py-1.5 text-sm text-mowing-green"
            />
            <button
              type="button"
              disabled={!!actionLoading || !counterAmount}
              onClick={() => handleCounter(latestPendingFromSeller.id)}
              className="rounded-lg border border-mowing-green/50 text-mowing-green px-4 py-2 text-sm font-medium hover:bg-mowing-green/10 disabled:opacity-70"
            >
              Counter
            </button>
          </div>
        </div>
      )}
      {!acceptedOffer && latestPendingFromBuyer && isCurrentUserBuyer === true && (
        <div className="shrink-0 mb-4">
          <button
            type="button"
            disabled={!!actionLoading}
            onClick={() => offerAction(latestPendingFromBuyer.id, "withdraw")}
            className="rounded-lg border border-mowing-green/50 text-mowing-green px-4 py-2 text-sm font-medium hover:bg-mowing-green/10 disabled:opacity-70"
          >
            Withdraw my offer
          </button>
        </div>
      )}

      {/* Make an offer: seller (when no pending buyer offer) or buyer (when no pending offer from buyer) */}
      {!acceptedOffer && listing?.status === "verified" && (isCurrentUserBuyer === false || (isCurrentUserBuyer === true && !latestPendingFromBuyer)) && (
        <div className="shrink-0 rounded-xl bg-mowing-green/10 border border-mowing-green/20 p-4 mb-4">
          <p className="text-sm font-medium text-mowing-green mb-2">Make an offer</p>
          {suggestedOfferPounds.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {suggestedOfferPounds.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() =>
                    isCurrentUserBuyer
                      ? setBuyerOfferAmount(p)
                      : setSellerProposeAmount(p)
                  }
                  className="rounded-lg border border-mowing-green/40 text-mowing-green px-3 py-1.5 text-sm font-medium hover:bg-mowing-green/10"
                >
                  £{p}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-mowing-green/80 text-sm">£</span>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={isCurrentUserBuyer ? buyerOfferAmount : sellerProposeAmount}
              onChange={(e) =>
                isCurrentUserBuyer
                  ? setBuyerOfferAmount(e.target.value)
                  : setSellerProposeAmount(e.target.value)
              }
              className="w-24 rounded border border-mowing-green/30 px-2 py-2 text-sm text-mowing-green"
            />
            <button
              type="button"
              disabled={
                (isCurrentUserBuyer ? buyerOfferLoading : sellerProposeLoading) ||
                !(isCurrentUserBuyer ? buyerOfferAmount : sellerProposeAmount)
              }
              onClick={isCurrentUserBuyer ? handleBuyerMakeOffer : handleSellerPropose}
              className="rounded-lg bg-mowing-green text-off-white-pique px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-70"
            >
              {(isCurrentUserBuyer ? buyerOfferLoading : sellerProposeLoading) ? "Sending…" : "Send offer"}
            </button>
          </div>
        </div>
      )}

        {/* Message thread: bubbles + system messages */}
        <div className="space-y-3 mb-4">
          {messages.map((m) => {
            const isFromCurrentUser = m.senderId === user?.id;
            if (m.messageType !== "text") {
              return (
                <div key={m.id} className="flex justify-center">
                  <p className="text-center text-sm text-mowing-green/70 bg-mowing-green/5 rounded-lg px-4 py-2 max-w-[90%]">
                    {getSystemMessageDisplay(m)}
                  </p>
                </div>
              );
            }
            return (
              <div
                key={m.id}
                className={`flex ${isFromCurrentUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                    isFromCurrentUser
                      ? "bg-mowing-green text-off-white-pique"
                      : "bg-mowing-green/15 text-mowing-green"
                  }`}
                >
                  {!isFromCurrentUser && (
                    <span className="font-medium text-mowing-green/90 text-xs block mb-0.5">
                      {formatChatDisplayNameForUI(m.senderChatDisplayName ?? null)}
                    </span>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                  <span
                    className={`text-xs mt-1 block ${isFromCurrentUser ? "text-off-white-pique/80" : "text-mowing-green/60"}`}
                  >
                    {formatMessageTimestamp(m.createdAt)}
                  </span>
                </div>
              </div>
            );
          })}
          <div />
        </div>
      </div>

      {/* Compose: always visible, sticky at bottom */}
      <div className="sticky bottom-0 shrink-0 bg-off-white-pique pt-2 pb-2 border-t border-mowing-green/20">
        <p className="text-mowing-green/60 text-xs mb-2">
          Keep payments and messaging on Teevo to stay protected. Transactions made outside Teevo are not protected. Payments protected on Teevo.
        </p>
        {listing?.status !== "verified" && listing !== null && (
          <p className="text-mowing-green/70 text-sm mb-2">Listing no longer available for new messages.</p>
        )}
        {messageBody.trim() && suggestsOffPlatformContact(messageBody) && (
          <p className="text-amber-700 bg-amber-100 border border-amber-300 rounded-lg px-3 py-2 text-sm mb-2" role="alert">
            Avoid sharing contact details; keep the conversation on Teevo to stay protected.
          </p>
        )}
        <form onSubmit={handleSendMessage} className="flex gap-3 items-end">
          <input
            type="text"
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            placeholder="Type a message…"
            maxLength={2000}
            disabled={sending || listing?.status !== "verified"}
            className="flex-1 min-w-0 rounded-lg border border-mowing-green/30 bg-white px-4 py-3 text-mowing-green placeholder:text-mowing-green/60 disabled:opacity-60 disabled:cursor-not-allowed"
            onPointerDown={() => {
              scrollYBeforeFocusRef.current = typeof window !== "undefined" ? window.scrollY : 0;
            }}
            onFocus={() => {
              const saved = scrollYBeforeFocusRef.current;
              if (typeof window === "undefined") return;
              requestAnimationFrame(() => {
                window.scrollTo({ top: saved, left: 0 });
              });
            }}
          />
          <button
            type="submit"
            disabled={sending || !messageBody.trim() || listing?.status !== "verified"}
            className="shrink-0 rounded-lg bg-mowing-green text-off-white-pique px-5 py-3 font-medium hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
        {sendError && (
          <p className="text-red-600 text-sm mt-2" role="alert">
            {sendError}
          </p>
        )}
      </div>
    </div>
  );
}
