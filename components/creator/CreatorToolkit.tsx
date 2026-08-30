"use client";

import { useMemo, useState } from "react";
import { Check, RotateCw, Share2 } from "lucide-react";
import {
  captionsForPlatform,
  type CreatorToolkitPlatform,
} from "@/lib/referral/share-copy";
import { track } from "@/lib/analytics";

type Caption = {
  id: string;
  title: string;
  caption: string;
  platform?: string;
};

const PLATFORMS: { id: CreatorToolkitPlatform; label: string }[] = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "facebook", label: "Facebook" },
];

type Props = {
  captions: Caption[];
  id?: string;
};

export function CreatorToolkit({ captions, id }: Props) {
  const [platform, setPlatform] = useState<CreatorToolkitPlatform>("instagram");
  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const filtered = useMemo(
    () => captionsForPlatform(captions as Parameters<typeof captionsForPlatform>[0], platform),
    [captions, platform]
  );

  const current = filtered[index % Math.max(filtered.length, 1)] ?? filtered[0];

  const canNativeShare = useMemo(
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    []
  );

  const copyCaption = async () => {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current.caption);
      setCopied(true);
      track("creator_content_copied", {
        content_template: current.id,
        share_channel: platform,
      });
      track("creator_caption_copied", { captionId: current.id });
      track("creator_message_copied", { captionId: current.id });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const shareCaption = async () => {
    if (!current) return;
    if (canNativeShare) {
      try {
        await navigator.share({ title: "Teevo", text: current.caption });
        track("creator_content_shared", {
          content_template: current.id,
          share_channel: platform,
        });
        track("creator_link_shared", { channel: "toolkit_native", captionId: current.id });
        return;
      } catch {
        /* cancelled */
      }
    }
    await copyCaption();
  };

  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="text-lg font-bold text-mowing-green">
        Ready to share <span aria-hidden>📱</span>
      </h2>
      <p className="mt-1 text-sm text-mowing-green/70">Pick a platform and grab a caption.</p>

      <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Content platform">
        {PLATFORMS.map((p) => {
          const selected = platform === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => {
                setPlatform(p.id);
                setIndex(0);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                selected
                  ? "bg-mowing-green text-off-white-pique"
                  : "border border-par-3-punch/25 bg-white text-mowing-green hover:bg-par-3-punch/10"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {current ? (
        <div className="mt-3 rounded-xl border border-par-3-punch/15 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-mowing-green/55">
            {current.title}
          </p>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-mowing-green">
            {current.caption}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copyCaption()}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-mowing-green/30 bg-white px-3 py-2 text-sm font-semibold text-mowing-green hover:bg-mowing-green/5"
            >
              {copied ? <Check className="h-4 w-4" /> : null}
              {copied ? "Copied ✓" : "Copy caption"}
            </button>
            <button
              type="button"
              onClick={() => void shareCaption()}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-mowing-green px-3 py-2 text-sm font-semibold text-off-white-pique hover:opacity-90"
            >
              <Share2 className="h-4 w-4" aria-hidden />
              Share
            </button>
            {filtered.length > 1 && (
              <button
                type="button"
                onClick={() => setIndex((i) => i + 1)}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-par-3-punch/25 px-3 py-2 text-sm font-medium text-mowing-green hover:bg-par-3-punch/10"
              >
                <RotateCw className="h-3.5 w-3.5" aria-hidden />
                Try another
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-mowing-green/70">No captions available right now.</p>
      )}
    </section>
  );
}
