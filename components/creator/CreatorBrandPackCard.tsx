"use client";

import { FolderOpen } from "lucide-react";

const BRAND_PACK_HREF = "/creator/brand-pack?source=creator_hub_card";

type Props = {
  id?: string;
};

export function CreatorBrandPackCard({ id }: Props) {
  const openBrandPack = () => {
    window.open(BRAND_PACK_HREF, "_blank", "noopener,noreferrer");
  };

  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-2xl border border-mowing-green/20 bg-gradient-to-br from-mowing-green/10 via-off-white-pique to-golden-tee/15 p-4 sm:p-5"
    >
      <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-mowing-green/80">
        <FolderOpen className="h-3.5 w-3.5" aria-hidden />
        Creator Resources
      </p>
      <h2 className="mt-1.5 text-lg font-bold text-mowing-green sm:text-xl">Create with Teevo</h2>
      <p className="mt-1 text-sm leading-relaxed text-mowing-green/80">
        Download approved Teevo logos, social templates, screenshots and campaign assets to create
        content for your audience.
      </p>
      <button
        type="button"
        onClick={openBrandPack}
        aria-label="Open Teevo Creator Brand Pack"
        className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-mowing-green px-4 py-3 text-sm font-semibold text-off-white-pique transition-colors hover:bg-mowing-green/90 sm:w-auto"
      >
        Open Brand Pack →
      </button>
    </section>
  );
}
