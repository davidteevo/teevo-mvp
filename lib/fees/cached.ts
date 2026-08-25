import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BuyerFeeConfig } from "@/lib/pricing";
import { getBuyerFeeSettings } from "@/lib/fees/settings";

export const getCachedBuyerFeeSettings = cache(async (): Promise<BuyerFeeConfig> => {
  return getBuyerFeeSettings(createAdminClient());
});

export async function tryGetCachedBuyerFeeSettings(): Promise<BuyerFeeConfig | null> {
  try {
    return await getCachedBuyerFeeSettings();
  } catch (e) {
    console.error("[buyer-fee-settings] display load failed", e);
    return null;
  }
}
