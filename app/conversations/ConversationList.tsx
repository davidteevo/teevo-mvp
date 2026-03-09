"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type ConversationItem = {
  id: string;
  listingId: string;
  listingTitle: string;
  listingPrice: number;
  listingImageUrl: string | null;
  listingStatus: string | null;
  otherPartyChatDisplayName: string;
  lastMessagePreview: string | null;
  lastActivityAt: string;
  updatedAt: string;
  isBuyer: boolean;
};

export function ConversationList() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/conversations");
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Failed to load conversations");
          return;
        }
        setConversations(data.conversations ?? []);
      } catch {
        if (!cancelled) setError("Failed to load conversations");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <p className="text-mowing-green/70 text-sm">Loading conversations…</p>
    );
  }
  if (error) {
    return (
      <p className="text-red-600 text-sm" role="alert">
        {error}
      </p>
    );
  }
  if (conversations.length === 0) {
    return (
      <p className="text-mowing-green/80">
        No conversations yet. Open a listing and tap &quot;Make offer / Ask seller&quot; to start.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {conversations.map((c) => (
        <li key={c.id}>
          <Link
            href={`/conversations/${c.id}`}
            className="flex gap-3 p-3 rounded-xl border border-mowing-green/20 hover:bg-mowing-green/5 transition-colors"
          >
            <div className="shrink-0 w-14 h-14 rounded-lg bg-mowing-green/10 overflow-hidden">
              {c.listingImageUrl ? (
                <Image
                  src={c.listingImageUrl}
                  alt=""
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="flex w-full h-full items-center justify-center text-mowing-green/50 text-xs">
                  No image
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-mowing-green truncate">
                {c.listingTitle || "Listing"}
              </p>
              <p className="text-sm text-mowing-green/70 truncate">
                {c.otherPartyChatDisplayName}
              </p>
              {c.lastMessagePreview && (
                <p className="text-sm text-mowing-green/60 truncate mt-0.5">
                  {c.lastMessagePreview}
                </p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-mowing-green font-semibold">
                £{(c.listingPrice / 100).toFixed(2)}
              </p>
              <p className="text-xs text-mowing-green/60">
                {new Date(c.lastActivityAt).toLocaleDateString()}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
