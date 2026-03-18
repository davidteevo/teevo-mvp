import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Marketplace display name: first name + 4 random digits (e.g. "Alex 4821").
 * Use "User" when first name is missing.
 */
export function generateDisplayNameFromFirstName(firstName: string | null | undefined): string {
  const base = (firstName?.trim() || "User").replace(/\s+/g, " ");
  const four = Math.floor(1000 + Math.random() * 9000);
  return `${base} ${four}`;
}

/**
 * If display_name is missing, set it from first_name (+ random digits) and persist.
 */
export async function ensureDisplayNameForUser(userId: string): Promise<string> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("users")
    .select("display_name, first_name")
    .eq("id", userId)
    .single();
  const existing = row?.display_name?.trim();
  if (existing) return existing;

  const name = generateDisplayNameFromFirstName(row?.first_name);
  const now = new Date().toISOString();
  await admin
    .from("users")
    .update({ display_name: name, updated_at: now })
    .eq("id", userId)
    .is("display_name", null);

  const { data: again } = await admin.from("users").select("display_name").eq("id", userId).single();
  return again?.display_name?.trim() || name;
}
