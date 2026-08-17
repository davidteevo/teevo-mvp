"use client";

import { useMemo, useState } from "react";
import { Check, Link2, MessageCircle, Share2 } from "lucide-react";
import { buyerShareMessage, sellerShareMessage } from "@/lib/referral/share-copy";
import { track } from "@/lib/analytics";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function ReferralShareActions({
  url,
  variant = "buyer",
  shareLabel = "Share with a friend",
}: {
  url: string;
  variant?: "buyer" | "seller";
  shareLabel?: string;
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState(() =>
    variant === "seller" ? sellerShareMessage(url) : buyerShareMessage(url)
  );
  const canNativeShare = useMemo(
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    []
  );

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      track("referral_link_shared", { channel: "copy" });
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(false);
    }
  };

  const sharePrimary = async () => {
    if (canNativeShare) {
      try {
        await navigator.share({ title: "Teevo", text: message, url });
        track("referral_link_shared", { channel: "native" });
      } catch {
        /* user cancelled */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(message);
      setCopiedShare(true);
      track("referral_link_shared", { channel: "copy" });
      window.setTimeout(() => setCopiedShare(false), 2000);
    } catch {
      setCopiedShare(false);
    }
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(message)}`;

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => void sharePrimary()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-mowing-green px-4 py-3.5 text-sm font-semibold text-off-white-pique hover:opacity-90"
      >
        <Share2 className="h-4 w-4" />
        {copiedShare ? "Copied" : shareLabel}
      </button>
      <div className="grid grid-cols-2 gap-2">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("referral_link_shared", { channel: "whatsapp" })}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-mowing-green/30 bg-white px-3 py-3 text-sm font-semibold text-mowing-green hover:bg-mowing-green/5"
        >
          <WhatsAppIcon className="h-4 w-4" />
          WhatsApp
        </a>
        <button
          type="button"
          onClick={() => void copyLink()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-mowing-green/30 bg-white px-3 py-3 text-sm font-semibold text-mowing-green hover:bg-mowing-green/5"
        >
          {copiedLink ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
          {copiedLink ? "Copied" : "Copy link"}
        </button>
      </div>
      <div className="rounded-2xl border border-par-3-punch/20 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-mowing-green">
            <MessageCircle className="h-4 w-4" aria-hidden />
            Your message
          </p>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="text-sm font-medium text-par-3-punch hover:underline"
          >
            {editing ? "Done" : "Edit"}
          </button>
        </div>
        {editing ? (
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="mt-3 w-full resize-y rounded-xl border border-mowing-green/30 bg-off-white-pique px-3 py-2 text-sm text-mowing-green"
          />
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-mowing-green/80">{message}</p>
        )}
      </div>
    </div>
  );
}
