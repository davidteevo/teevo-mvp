"use client";

import type { BuyerFeeConfig } from "@/lib/pricing";

let inflight: Promise<BuyerFeeConfig | null> | null = null;

export function loadPublicBuyerFees(): Promise<BuyerFeeConfig | null> {
  if (!inflight) {
    inflight = fetch("/api/fees")
      .then(async (r) => {
        if (!r.ok) return null;
        const data = (await r.json()) as BuyerFeeConfig;
        if (
          typeof data.percentage !== "number" ||
          typeof data.percentageHundredths !== "number" ||
          typeof data.fixedPence !== "number"
        ) {
          return null;
        }
        return data;
      })
      .catch(() => null);
  }
  return inflight;
}
