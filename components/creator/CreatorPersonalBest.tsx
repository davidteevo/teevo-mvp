"use client";

import type { CreatorHubPersonalBest } from "@/lib/creator/hub";

export function CreatorPersonalBest({ best }: { best: NonNullable<CreatorHubPersonalBest> }) {
  return (
    <section className="rounded-2xl border border-golden-tee/40 bg-golden-tee/15 px-5 py-4">
      <p className="font-semibold text-mowing-green">
        <span aria-hidden>{best.emoji} </span>
        {best.title}
      </p>
      <p className="mt-1 text-sm text-mowing-green/80">{best.body}</p>
    </section>
  );
}
