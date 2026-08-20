import type { SupabaseClient } from "@supabase/supabase-js";
import {
  FOUNDER_CAMPAIGN_LIMIT,
  PLATFORM_SETTING_FOUNDER_LIMIT,
  PLATFORM_SETTING_FOUNDER_STATUS,
  parseFounderCampaignStatus,
  parseFounderLimit,
  type FounderCampaignStatus,
} from "@/lib/founder/types";

export type FounderCampaignSnapshot = {
  status: FounderCampaignStatus;
  claimed: number;
  remaining: number;
  limit: number;
  activated: number;
};

export async function getFounderCampaignSnapshot(
  admin: SupabaseClient
): Promise<FounderCampaignSnapshot> {
  try {
    const [{ data: settings }, claimedRes, activatedRes] = await Promise.all([
      admin
        .from("platform_settings")
        .select("key, value")
        .in("key", [PLATFORM_SETTING_FOUNDER_STATUS, PLATFORM_SETTING_FOUNDER_LIMIT]),
      admin
        .from("users")
        .select("id", { count: "exact", head: true })
        .not("founding_seller_rank", "is", null),
      admin
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("founder_reward_status", "earned"),
    ]);

    // Pre-migration: founder_reward_status column missing — treat as inactive campaign UI
    if (activatedRes.error && /founder_reward_status|does not exist/i.test(activatedRes.error.message)) {
      return {
        status: "complete",
        claimed: 0,
        remaining: 0,
        limit: FOUNDER_CAMPAIGN_LIMIT,
        activated: 0,
      };
    }

    const map = new Map((settings ?? []).map((r) => [r.key, r.value]));
    let status = parseFounderCampaignStatus(map.get(PLATFORM_SETTING_FOUNDER_STATUS));
    // Settings key missing → don't force active marketing until migration applied
    if (!map.has(PLATFORM_SETTING_FOUNDER_STATUS)) {
      status = "complete";
    }
    const limit = parseFounderLimit(map.get(PLATFORM_SETTING_FOUNDER_LIMIT));
    const claimed = claimedRes.count ?? 0;
    const activated = activatedRes.count ?? 0;

    if (claimed >= limit && status === "active") {
      status = "complete";
    }

    return {
      status,
      claimed: Math.min(claimed, limit),
      remaining: Math.max(0, limit - claimed),
      limit,
      activated,
    };
  } catch (e) {
    console.error("getFounderCampaignSnapshot", e);
    return {
      status: "complete",
      claimed: 0,
      remaining: 0,
      limit: FOUNDER_CAMPAIGN_LIMIT,
      activated: 0,
    };
  }
}

export async function setFounderCampaignStatus(
  admin: SupabaseClient,
  status: FounderCampaignStatus
): Promise<void> {
  if (status === "active") {
    const { count } = await admin
      .from("users")
      .select("id", { count: "exact", head: true })
      .not("founding_seller_rank", "is", null);
    if ((count ?? 0) >= FOUNDER_CAMPAIGN_LIMIT) {
      throw new Error("Cannot resume: all 100 Founder places are already allocated.");
    }
  }

  const { error } = await admin.from("platform_settings").upsert(
    {
      key: PLATFORM_SETTING_FOUNDER_STATUS,
      value: status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
  if (error) throw new Error(error.message);
}

export function isFounderCampaignActive(snapshot: FounderCampaignSnapshot): boolean {
  return snapshot.status === "active" && snapshot.remaining > 0;
}
