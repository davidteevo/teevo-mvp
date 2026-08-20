import type { SupabaseClient } from "@supabase/supabase-js";
import { trackServerEvent } from "@/lib/starter-pack";
import { FOUNDER_EVENTS } from "@/lib/founder/types";

/**
 * Allocate a Founding Member number for a newly created public.users row.
 * Safe to call when campaign is paused/complete — returns null and never fails signup.
 */
export async function allocateFoundingMemberIfEligible(
  admin: SupabaseClient,
  userId: string
): Promise<number | null> {
  try {
    const { data, error } = await admin.rpc("allocate_founding_member", {
      p_user_id: userId,
    });
    if (error) {
      console.error("allocate_founding_member failed", error);
      return null;
    }
    const rank =
      typeof data === "number"
        ? data
        : typeof data === "string"
          ? parseInt(data, 10)
          : null;
    if (typeof rank === "number" && Number.isFinite(rank) && rank >= 1 && rank <= 100) {
      await trackServerEvent(admin, FOUNDER_EVENTS.NUMBER_ALLOCATED, {
        userId,
        properties: { founder_number: rank },
      }).catch(() => {});
      return rank;
    }
    return null;
  } catch (e) {
    console.error("allocateFoundingMemberIfEligible", e);
    return null;
  }
}
