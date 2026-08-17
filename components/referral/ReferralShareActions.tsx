"use client";

import { useMemo, useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";
import { buyerShareMessage, sellerShareMessage } from "@/lib/referral/share-copy";
import { track } from "@/lib/analytics";

export function ReferralShareActions({
  url,
  variant = "buyer",
}: {
  url: string;
  variant?: "buyer" | "seller";
}) {
  const [copied, setCopied] = useState(false);
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
      setCopied(true);
      track("referral_link_shared", { channel: "copy" });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const shareNative = async () => {
    try {
      await navigator.share({ title: "Teevo", text: message, url });
      track("referral_link_shared", { channel: "native" });
    } catch {
      /* user cancelled */
    }
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(message)}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={() => void copyLink()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-mowing-green text-off-white-pique px-4 py-3 text-sm font-semibold hover:opacity-90"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy link"}
        </button>
        {canNativeShare && (
          <button
            type="button"
            onClick={() => void shareNative()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-mowing-green/30 text-mowing-green px-4 py-3 text-sm font-semibold hover:bg-mowing-green/5"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
        )}
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("referral_link_shared", { channel: "whatsapp" })}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-mowing-green/30 text-mowing-green px-4 py-3 text-sm font-semibold hover:bg-mowing-green/5"
        >
          Share on WhatsApp
        </a>
      </div>
      <div>
        <label className="block text-sm font-medium text-mowing-green mb-1">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-mowing-green/30 bg-white px-3 py-2 text-sm text-mowing-green resize-y"
        />
        <p className="mt-1 text-xs text-mowing-green/60">Edit this before sending on WhatsApp or Share.</p>
      </div>
    </div>
  );
}
