import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * After a listing row exists for this user, set users.founding_seller_rank (1–100)
 * when they qualify. Idempotent if rank already set.
 *
 * @param knownFoundingRank — pass profile.founding_seller_rank when already loaded to skip an extra read
 */
export async function assignFoundingSellerRankIfEligible(
  admin: SupabaseClient,
  userId: string,
  knownFoundingRank?: number | null
): Promise<void> {
  let existing: number | null | undefined = knownFoundingRank;
  if (knownFoundingRank === undefined) {
    const { data } = await admin
      .from("users")
      .select("founding_seller_rank")
      .eq("id", userId)
      .single();
    existing = data?.founding_seller_rank ?? null;
  }
  if (existing != null) return;

  const { data: rankResult } = await admin.rpc("get_founding_seller_rank", { p_user_id: userId });
  const first = Array.isArray(rankResult) && rankResult.length > 0 ? rankResult[0] : rankResult;
  const rank =
    typeof first === "number"
      ? first
      : typeof first === "object" && first !== null
        ? (first as Record<string, unknown>).get_founding_seller_rank ??
          (first as Record<string, unknown>).rn ??
          null
        : null;

  if (typeof rank === "number" && rank >= 1 && rank <= 100) {
    await admin
      .from("users")
      .update({ founding_seller_rank: rank, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .or("founding_seller_rank.is.null,founding_seller_rank.gt." + rank);
  }
}
