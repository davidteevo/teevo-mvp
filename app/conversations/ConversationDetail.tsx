"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

type Listing = {
  id: string;
  title: string;
  price: number;
  status: string;
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
  otherPartyChatDisplayName: string;
  messages: Message[];
  offers: Offer[];
};

const POLL_INTERVAL_MS = 15000;

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

  const handleBuyAcceptedOffer = async (offerId: string, amountPence: number) => {
    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: payload?.listing?.id,
          acceptedOfferId: offerId,
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

  const { conversation, listing, otherPartyChatDisplayName, messages, offers } = payload;
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

  const handleSellerPropose = async () => {
    const pence = Math.round(parseFloat(sellerProposeAmount) * 100);
    if (!Number.isInteger(pence) || pence <= 0 || !listing) return;
    if (pence > listing.price) {
      alert("Offer cannot exceed listing price");
      return;
    }
    setSellerProposeLoading(true);
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
      setSellerProposeAmount("");
      await fetchConversation();
    } catch {
      alert("Failed to send offer");
    } finally {
      setSellerProposeLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[400px]">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="shrink-0 mb-4">
          <Link href="/conversations" className="text-sm text-mowing-green/70 hover:text-mowing-green">
            ← Back to messages
          </Link>
        </div>

        {listing && (
        <div className="shrink-0 flex gap-3 p-3 rounded-xl border border-mowing-green/20 bg-mowing-green/5 mb-4">
          <Link href={`/listing/${listing.id}`} className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-mowing-green/10">
            {listing.imageUrl ? (
              <Image src={listing.imageUrl} alt="" width={64} height={64} className="w-full h-full object-cover" />
            ) : (
              <span className="flex w-full h-full items-center justify-center text-mowing-green/50 text-xs">No image</span>
            )}
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={`/listing/${listing.id}`} className="font-medium text-mowing-green hover:underline truncate block">
              {listing.title}
            </Link>
            <p className="text-mowing-green font-semibold">£{(listing.price / 100).toFixed(2)}</p>
          </div>
          <Link
            href={`/listing/${listing.id}`}
            className="shrink-0 self-center rounded-lg border border-mowing-green/40 text-mowing-green px-3 py-1.5 text-sm font-medium hover:bg-mowing-green/10"
          >
            View listing
          </Link>
        </div>
      )}

      <p className="text-sm text-mowing-green/70 mb-2">Chat with {otherPartyChatDisplayName}</p>

      {/* Accepted offer CTA */}
      {acceptedOffer && listing?.status === "verified" && isCurrentUserBuyer && (
        <div className="shrink-0 rounded-xl bg-mowing-green/15 border border-mowing-green/30 p-4 mb-4">
          <p className="font-medium text-mowing-green mb-2">Offer accepted. Complete purchase.</p>
          <button
            type="button"
            onClick={() => handleBuyAcceptedOffer(acceptedOffer.id, acceptedOffer.amount_pence)}
            className="rounded-xl bg-mowing-green text-off-white-pique px-6 py-3 font-semibold hover:opacity-90"
          >
            Buy for £{(acceptedOffer.amount_pence / 100).toFixed(2)}
          </button>
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

      {/* Seller: propose a price (send offer in return so buyer can accept from chat) */}
      {!acceptedOffer && isCurrentUserBuyer === false && listing?.status === "verified" && (
        <div className="shrink-0 flex flex-wrap items-center gap-2 mb-4">
          <span className="text-sm text-mowing-green/80">Propose price:</span>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="£"
            value={sellerProposeAmount}
            onChange={(e) => setSellerProposeAmount(e.target.value)}
            className="w-24 rounded border border-mowing-green/30 px-2 py-1.5 text-sm text-mowing-green"
          />
          <button
            type="button"
            disabled={sellerProposeLoading || !sellerProposeAmount}
            onClick={handleSellerPropose}
            className="rounded-lg bg-mowing-green text-off-white-pique px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-70"
          >
            {sellerProposeLoading ? "Sending…" : "Send offer"}
          </button>
        </div>
      )}

        {/* Message thread */}
        <div className="space-y-3 mb-4">
          {messages.map((m) => (
            <div key={m.id} className="text-sm">
              {m.messageType === "text" ? (
                <>
                  <span className="font-medium text-mowing-green/80">
                    {m.senderChatDisplayName ?? "Teevo"}
                  </span>
                  <span className="text-mowing-green/60 ml-1 text-xs">
                    {new Date(m.createdAt).toLocaleString()}
                  </span>
                  <p className="mt-0.5 text-mowing-green whitespace-pre-wrap">{m.body}</p>
                </>
              ) : (
                <p className="text-mowing-green/80 italic">
                  {m.body ?? m.messageType}
                </p>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Compose: always visible, sticky at bottom */}
      <div className="sticky bottom-0 shrink-0 bg-off-white-pique pt-2 border-t border-mowing-green/20">
        {listing?.status !== "verified" && listing !== null && (
          <p className="text-mowing-green/70 text-sm mb-2">Listing no longer available for new messages.</p>
        )}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            placeholder="Type a message…"
            maxLength={2000}
            disabled={sending || listing?.status !== "verified"}
            className="flex-1 rounded-lg border border-mowing-green/30 bg-white px-4 py-3 text-mowing-green placeholder:text-mowing-green/50 disabled:opacity-70"
          />
          <button
            type="submit"
            disabled={sending || !messageBody.trim() || listing?.status !== "verified"}
            className="rounded-lg bg-mowing-green text-off-white-pique px-4 py-3 font-medium hover:opacity-90 disabled:opacity-70"
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
