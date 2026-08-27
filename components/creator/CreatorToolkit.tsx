"use client";

import { useMemo, useState } from "react";
import { Check, Share2 } from "lucide-react";
import { track } from "@/lib/analytics";

type Caption = { id: string; title: string; caption: string };

type Props = {
  captions: Caption[];
};

export function CreatorToolkit({ captions }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const canNativeShare = useMemo(
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    []
  );

  const copyCaption = async (c: Caption) => {
    try {
      await navigator.clipboard.writeText(c.caption);
      setCopiedId(c.id);
      track("creator_caption_copied", { captionId: c.id });
      track("creator_message_copied", { captionId: c.id });
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(null);
    }
  };

  const shareCaption = async (c: Caption) => {
    if (canNativeShare) {
      try {
        await navigator.share({ title: "Teevo", text: c.caption });
        track("creator_link_shared", { channel: "toolkit_native", captionId: c.id });
        return;
      } catch {
        /* cancelled */
      }
    }
    await copyCaption(c);
  };

  return (
    <section className="rounded-2xl border border-par-3-punch/20 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-bold text-mowing-green">
        Ready to share <span aria-hidden>📲</span>
      </h2>
      <p className="mt-1 text-sm text-mowing-green/70">Grab a caption and post it.</p>
      <ul className="mt-4 space-y-3">
        {captions.map((c) => (
          <li
            key={c.id}
            className="rounded-xl border border-par-3-punch/15 bg-off-white-pique p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-mowing-green/60">
              {c.title}
            </p>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-mowing-green">
              {c.caption}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copyCaption(c)}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-mowing-green/30 bg-white px-3 py-2 text-sm font-semibold text-mowing-green hover:bg-mowing-green/5"
              >
                {copiedId === c.id ? <Check className="h-4 w-4" /> : null}
                {copiedId === c.id ? "Copied ✓" : "Copy caption"}
              </button>
              <button
                type="button"
                onClick={() => void shareCaption(c)}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-mowing-green px-3 py-2 text-sm font-semibold text-off-white-pique hover:opacity-90"
              >
                <Share2 className="h-4 w-4" aria-hidden />
                Share
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
