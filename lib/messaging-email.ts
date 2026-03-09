import { createAdminClient } from "@/lib/supabase/admin";
import { ensureEmailSent } from "@/lib/email-triggers";
import { EmailTriggerType } from "@/lib/email-triggers";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";

/**
 * Send "new message" email to the other party. Call after inserting a text message.
 */
export async function sendNewMessageNotification(
  conversationId: string,
  messageId: string,
  recipientUserId: string
): Promise<void> {
  const admin = createAdminClient();
  const { data: recipient } = await admin
    .from("users")
    .select("email")
    .eq("id", recipientUserId)
    .single();
  if (!recipient?.email) return;

  await ensureEmailSent(admin, {
    emailType: EmailTriggerType.MESSAGE_RECEIVED,
    referenceId: messageId,
    referenceType: "message",
    recipientId: recipientUserId,
    to: recipient.email,
    subject: "New message on Teevo",
    type: "standard",
    variables: {
      title: "New message",
      subtitle: "You have a new message in a conversation.",
      body: "Open Teevo to view and reply.",
      cta_link: `${APP_URL}/conversations/${conversationId}`,
      cta_text: "View conversation",
    },
  });
}

/**
 * Send offer-related notification to the other party.
 */
export async function sendOfferNotification(
  offerId: string,
  eventType: "offer_made" | "offer_accepted" | "offer_declined" | "offer_countered",
  recipientUserId: string,
  listingTitle: string,
  amountPence?: number
): Promise<void> {
  const admin = createAdminClient();
  const { data: conv } = await admin
    .from("offers")
    .select("conversation_id")
    .eq("id", offerId)
    .single();
  if (!conv) return;

  const { data: recipient } = await admin
    .from("users")
    .select("email")
    .eq("id", recipientUserId)
    .single();
  if (!recipient?.email) return;

  const amountStr = amountPence != null ? ` £${(amountPence / 100).toFixed(2)}` : "";
  const titles: Record<string, string> = {
    offer_made: "New offer on your listing",
    offer_accepted: "Your offer was accepted",
    offer_declined: "Offer declined",
    offer_countered: "Counter offer received",
  };
  const bodies: Record<string, string> = {
    offer_made: `Someone made an offer${amountStr} on "${listingTitle}".`,
    offer_accepted: `Your offer${amountStr} for "${listingTitle}" was accepted. Complete purchase on Teevo.`,
    offer_declined: `Your offer for "${listingTitle}" was declined.`,
    offer_countered: `You received a counter offer${amountStr} for "${listingTitle}".`,
  };
  const triggerTypes = {
    offer_made: EmailTriggerType.OFFER_MADE,
    offer_accepted: EmailTriggerType.OFFER_ACCEPTED,
    offer_declined: EmailTriggerType.OFFER_DECLINED,
    offer_countered: EmailTriggerType.OFFER_COUNTERED,
  };

  await ensureEmailSent(admin, {
    emailType: triggerTypes[eventType],
    referenceId: `${offerId}:${eventType}`,
    referenceType: "offer",
    recipientId: recipientUserId,
    to: recipient.email,
    subject: titles[eventType],
    type: "standard",
    variables: {
      title: titles[eventType],
      subtitle: bodies[eventType],
      body: "Open Teevo to view and respond.",
      cta_link: `${APP_URL}/conversations/${conv.conversation_id}`,
      cta_text: "View conversation",
    },
  });
}
