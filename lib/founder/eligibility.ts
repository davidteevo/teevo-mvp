import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Users who must never consume Founder spots.
 */
export function isExcludedFromFounderAllocation(user: {
  role?: string | null;
  created_by_admin?: boolean | null;
}): boolean {
  if (user.role === "admin") return true;
  if (user.created_by_admin === true) return true;
  return false;
}

export async function loadUserFounderEligibility(
  admin: SupabaseClient,
  userId: string
): Promise<{ role: string | null; created_by_admin: boolean; founding_seller_rank: number | null } | null> {
  const { data } = await admin
    .from("users")
    .select("role, created_by_admin, founding_seller_rank")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;
  return {
    role: data.role ?? null,
    created_by_admin: data.created_by_admin === true,
    founding_seller_rank:
      typeof data.founding_seller_rank === "number" ? data.founding_seller_rank : null,
  };
}
