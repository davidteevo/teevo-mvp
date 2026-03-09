import { createAdminClient } from "@/lib/supabase/admin";

const CHAT_DISPLAY_NAME_PREFIX = "teevo_golfer_";

/**
 * Ensures the user has a chat_display_name (for identity protection in chat).
 * If missing, generates one like teevo_golfer_4821 and persists it.
 * Returns the chat display name to use in chat UI (never email/full name).
 */
export async function getOrCreateChatDisplayName(userId: string): Promise<string> {
  const admin = createAdminClient();
  const { data: user, error: fetchError } = await admin
    .from("users")
    .select("chat_display_name")
    .eq("id", userId)
    .single();

  if (fetchError) {
    throw new Error("User not found");
  }

  const existing = user?.chat_display_name?.trim();
  if (existing) {
    return existing;
  }

  const suffix = Math.floor(1000 + Math.random() * 900000).toString();
  const chatDisplayName = `${CHAT_DISPLAY_NAME_PREFIX}${suffix}`;

  const { error: updateError } = await admin
    .from("users")
    .update({
      chat_display_name: chatDisplayName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (updateError) {
    throw new Error("Failed to set chat display name");
  }

  return chatDisplayName;
}

/**
 * Returns the chat_display_name for a user (no side effects).
 * Use when you already have the user row; for ensuring one exists, use getOrCreateChatDisplayName.
 */
export function formatChatDisplayName(chatDisplayName: string | null): string {
  return chatDisplayName?.trim() || "Teevo user";
}

/**
 * Softer display name for UI: teevo_golfer_123456 -> Golfer_123456; keeps anonymity.
 */
export function formatChatDisplayNameForUI(chatDisplayName: string | null): string {
  const raw = chatDisplayName?.trim();
  if (!raw) return "Teevo user";
  const match = raw.match(/^teevo_golfer_(\d+)$/i);
  if (match) return `Golfer_${match[1]}`;
  const sellerMatch = raw.match(/^teevo_seller_(\d+)$/i);
  if (sellerMatch) return `Seller_${sellerMatch[1]}`;
  return raw;
}
