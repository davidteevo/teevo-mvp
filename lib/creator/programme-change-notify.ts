/**
 * Selective in-app notifications when Creator Programme settings change materially.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { LONDON_TZ, londonDateString } from "@/lib/business-days";
import {
  createNotification,
  NotificationEntityType,
  NotificationType,
} from "@/lib/notifications";
import type { ReferralSettings } from "@/lib/referral/settings";

function rewardsChanged(prev: ReferralSettings, next: ReferralSettings): boolean {
  return (
    prev.creatorNewUserRewardEnabled !== next.creatorNewUserRewardEnabled ||
    prev.creatorNewUserRewardPence !== next.creatorNewUserRewardPence ||
    prev.creatorListingRewardEnabled !== next.creatorListingRewardEnabled ||
    prev.creatorListingRewardPence !== next.creatorListingRewardPence ||
    prev.creatorTransactionRewardEnabled !== next.creatorTransactionRewardEnabled ||
    prev.creatorTransactionRewardPence !== next.creatorTransactionRewardPence ||
    prev.creatorEnabled !== next.creatorEnabled
  );
}

function missionChanged(prev: ReferralSettings, next: ReferralSettings): boolean {
  return (
    prev.creatorMissionTitle !== next.creatorMissionTitle ||
    prev.creatorMissionBody !== next.creatorMissionBody ||
    prev.creatorMissionRewardCallout !== next.creatorMissionRewardCallout ||
    prev.creatorSuggestedMessage !== next.creatorSuggestedMessage
  );
}

export async function notifyCreatorsOfProgrammeChanges(
  admin: SupabaseClient,
  previous: ReferralSettings,
  next: ReferralSettings
): Promise<{ notified: number }> {
  const rewardDelta = rewardsChanged(previous, next);
  const missionDelta = missionChanged(previous, next);
  if (!rewardDelta && !missionDelta) return { notified: 0 };

  const { data: creators } = await admin
    .from("creators")
    .select("id, user_id")
    .eq("status", "active")
    .not("user_id", "is", null);

  const userIds = Array.from(
    new Set((creators ?? []).map((c) => c.user_id as string).filter(Boolean))
  );
  if (userIds.length === 0) return { notified: 0 };

  const day = londonDateString(new Date());
  let notified = 0;

  for (const userId of userIds) {
    if (rewardDelta) {
      const id = await createNotification(admin, {
        userId,
        type: NotificationType.REFERRAL_BUYER_REWARD,
        title: "Your Creator Rewards have changed 👀",
        message: "Check out the latest rewards in your Creator Hub.",
        entityType: NotificationEntityType.ACCOUNT,
        entityId: `creator_programme_rewards:${day}`,
        actionUrl: "/dashboard/creator",
        actionLabel: "Open Creator Hub",
        requiresAction: false,
        metadata: { kind: "creator_programme_rewards_changed", tz: LONDON_TZ },
      });
      if (id) notified += 1;
    }
    if (missionDelta) {
      const id = await createNotification(admin, {
        userId,
        type: NotificationType.REFERRAL_BUYER_REWARD,
        title: "New Teevo mission 🎯",
        message: next.creatorMissionTitle || "We're focusing on growing Teevo with creators.",
        entityType: NotificationEntityType.ACCOUNT,
        entityId: `creator_programme_mission:${day}`,
        actionUrl: "/dashboard/creator",
        actionLabel: "Open Creator Hub",
        requiresAction: false,
        metadata: { kind: "creator_programme_mission_changed", tz: LONDON_TZ },
      });
      if (id) notified += 1;
    }
  }

  return { notified };
}
