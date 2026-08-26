/**
 * Stamp public.users.email_confirmed_at from auth (once).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Copy auth.email_confirmed_at onto public.users when missing.
 * Safe to call on every sync; never overwrites an existing stamp.
 */
export async function ensureUserEmailConfirmedAt(
  admin: SupabaseClient,
  userId: string,
  authEmailConfirmedAt?: string | null
): Promise<void> {
  let confirmedAt = authEmailConfirmedAt ?? null;
  if (!confirmedAt) {
    const { data } = await admin.auth.admin.getUserById(userId);
    confirmedAt = data.user?.email_confirmed_at ?? null;
  }
  if (!confirmedAt) return;

  const { data: row } = await admin
    .from("users")
    .select("email_confirmed_at")
    .eq("id", userId)
    .maybeSingle();
  if (!row || row.email_confirmed_at) return;

  await admin
    .from("users")
    .update({
      email_confirmed_at: confirmedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .is("email_confirmed_at", null);
}
