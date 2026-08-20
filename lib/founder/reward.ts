import type { SupabaseClient } from "@supabase/supabase-js";
import { insertCreditTransaction } from "@/lib/referral/credit";
import { trackServerEvent } from "@/lib/starter-pack";
import { FOUNDER_EVENTS, FOUNDER_REWARD_PENCE } from "@/lib/founder/types";

/**
 * Issue £5 Teevo credit when a Founder's first qualifying listing is verified.
 * Idempotent; never awards on signup or draft/pending alone.
 */
export async function onFounderListingVerified(
  admin: SupabaseClient,
  args: {
    listingId: string;
    sellerId: string;
    createdOnBehalf: boolean;
  }
): Promise<{ awarded: boolean; founderNumber: number | null }> {
  if (args.createdOnBehalf) {
    return { awarded: false, founderNumber: null };
  }

  const { data: user } = await admin
    .from("users")
    .select("founding_seller_rank, founder_reward_status")
    .eq("id", args.sellerId)
    .maybeSingle();

  const founderNumber =
    typeof user?.founding_seller_rank === "number" ? user.founding_seller_rank : null;

  if (founderNumber == null) {
    return { awarded: false, founderNumber: null };
  }

  if (user?.founder_reward_status === "earned") {
    return { awarded: false, founderNumber };
  }

  if (user?.founder_reward_status !== "eligible") {
    return { awarded: false, founderNumber };
  }

  const credit = await insertCreditTransaction(admin, {
    userId: args.sellerId,
    amountPence: FOUNDER_REWARD_PENCE,
    type: "founder_listing_reward",
    status: "available",
    adminNotes: `Founder #${String(founderNumber).padStart(3, "0")} first-listing reward`,
  });

  if (!credit) {
    // Unique constraint race — treat as already awarded
    const { data: existing } = await admin
      .from("credit_transactions")
      .select("id")
      .eq("user_id", args.sellerId)
      .eq("type", "founder_listing_reward")
      .maybeSingle();
    if (existing) {
      await admin
        .from("users")
        .update({
          founder_reward_status: "earned",
          founder_reward_earned_at: new Date().toISOString(),
          founder_reward_listing_id: args.listingId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", args.sellerId)
        .eq("founder_reward_status", "eligible");
    }
    return { awarded: Boolean(existing), founderNumber };
  }

  const now = new Date().toISOString();
  await admin
    .from("users")
    .update({
      founder_reward_status: "earned",
      founder_reward_earned_at: now,
      founder_reward_listing_id: args.listingId,
      updated_at: now,
    })
    .eq("id", args.sellerId)
    .eq("founder_reward_status", "eligible");

  await trackServerEvent(admin, FOUNDER_EVENTS.REWARD_EARNED, {
    userId: args.sellerId,
    properties: {
      founder_number: founderNumber,
      listing_id: args.listingId,
      amount_pence: FOUNDER_REWARD_PENCE,
    },
  }).catch(() => {});

  return { awarded: true, founderNumber };
}
