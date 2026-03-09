import type { SupabaseClient } from "@supabase/supabase-js";

export const MessagingEventType = {
  CONVERSATION_CREATED: "conversation_created",
  MESSAGE_SENT: "message_sent",
  OFFER_MADE: "offer_made",
  OFFER_ACCEPTED: "offer_accepted",
  OFFER_DECLINED: "offer_declined",
  OFFER_COUNTERED: "offer_countered",
} as const;

/**
 * Log a messaging event for KPIs: % listings with messages, % conversations with offers,
 * % offers accepted, offer → purchase conversion, avg offer discount vs list price.
 */
export async function trackMessagingEvent(
  admin: SupabaseClient,
  eventType: string,
  referenceId: string,
  referenceType: "conversation" | "message" | "offer" | "listing",
  payload: Record<string, unknown> = {}
): Promise<void> {
  try {
    await admin.from("messaging_analytics").insert({
      event_type: eventType,
      reference_id: referenceId,
      reference_type: referenceType,
      payload,
    });
  } catch {
    // Non-fatal; do not break the request
  }
}
