"use client";

import { useMemo, useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import { creatorShareMessage } from "@/lib/referral/share-copy";
import { track } from "@/lib/analytics";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.006 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

type Props = {
  url: string;
  code: string;
  id?: string;
};

export function CreatorSharePanel({ url, code, id }: Props) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const message = useMemo(() => creatorShareMessage(url), [url]);
  const canNativeShare = useMemo(
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    []
  );

  const compactUrl = (() => {
    try {
      const u = new URL(url);
      return `${u.host}${u.pathname}`;
    } catch {
      return url;
    }
  })();

  const flash = (text: string) => {
    setFeedback(text);
    window.setTimeout(() => setFeedback(null), 2500);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      track("creator_link_shared", { channel: "copy" });
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(false);
    }
  };

  const sharePrimary = async () => {
    if (canNativeShare) {
      try {
        await navigator.share({ title: "Teevo", text: message, url });
        track("creator_link_shared", { channel: "native" });
      } catch {
        /* cancelled */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(message);
      flash("Message copied — paste it anywhere");
      track("creator_link_shared", { channel: "copy_message" });
    } catch {
      flash("Could not copy");
    }
  };

  const copyForPlatform = async (channel: string, label: string) => {
    try {
      await navigator.clipboard.writeText(message);
      flash(`${label}: caption + link copied`);
      track("creator_link_shared", { channel });
    } catch {
      flash("Could not copy");
    }
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(message)}`;

  return (
    <section
      id={id}
      className="rounded-2xl border border-par-3-punch/20 bg-white p-5 sm:p-6 scroll-mt-24"
    >
      <h2 className="text-lg font-bold text-mowing-green">Share Teevo</h2>
      <p className="mt-1 text-sm text-mowing-green/70">Your Creator Link</p>
      <p className="mt-2 truncate rounded-xl bg-off-white-pique px-3 py-2 font-mono text-sm text-mowing-green">
        {compactUrl}
        <span className="sr-only"> ({code})</span>
      </p>

      <button
        type="button"
        onClick={() => void sharePrimary()}
        className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-mowing-green px-4 py-3 text-sm font-semibold text-off-white-pique hover:opacity-90"
      >
        <Share2 className="h-4 w-4" aria-hidden />
        Share my link 🚀
      </button>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void copyLink()}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-mowing-green/30 bg-white px-3 py-2.5 text-sm font-semibold text-mowing-green hover:bg-mowing-green/5"
        >
          {copiedLink ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
          {copiedLink ? "Copied ✓" : "Copy link"}
        </button>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("creator_link_shared", { channel: "whatsapp" })}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-mowing-green/30 bg-white px-3 py-2.5 text-sm font-semibold text-mowing-green hover:bg-mowing-green/5"
        >
          <WhatsAppIcon className="h-4 w-4" />
          WhatsApp
        </a>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void copyForPlatform("instagram", "Instagram")}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-mowing-green/20 bg-par-3-punch/10 px-3 py-2.5 text-sm font-medium text-mowing-green hover:bg-par-3-punch/20"
        >
          Instagram
        </button>
        <button
          type="button"
          onClick={() => void copyForPlatform("tiktok", "TikTok")}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-mowing-green/20 bg-par-3-punch/10 px-3 py-2.5 text-sm font-medium text-mowing-green hover:bg-mowing-green/5"
        >
          TikTok
        </button>
      </div>

      {feedback && (
        <p className="mt-3 text-sm text-mowing-green" role="status">
          {feedback}
        </p>
      )}
    </section>
  );
}

/** Imperative helpers for hero / sticky share when panel is elsewhere */
export async function shareCreatorLink(url: string): Promise<"shared" | "copied" | "cancelled"> {
  const message = creatorShareMessage(url);
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title: "Teevo", text: message, url });
      track("creator_link_shared", { channel: "native" });
      return "shared";
    } catch {
      return "cancelled";
    }
  }
  try {
    await navigator.clipboard.writeText(message);
    track("creator_link_shared", { channel: "copy_message" });
    return "copied";
  } catch {
    return "cancelled";
  }
}

export async function copyCreatorUrl(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    track("creator_link_shared", { channel: "copy" });
    return true;
  } catch {
    return false;
  }
}
