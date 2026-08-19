import { createAdminClient } from "@/lib/supabase/admin";
import { ensureEmailSent, EmailTriggerType, getListingEmailContext } from "@/lib/email-triggers";

import { getAppUrl } from "@/lib/app-env";

const APP_URL = getAppUrl();

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

  const { data: conversation } = await admin
    .from("conversations")
    .select("listing_id")
    .eq("id", conversationId)
    .maybeSingle();
  const { hero_image } = await getListingEmailContext(admin, conversation?.listing_id);

  await ensureEmailSent(admin, {
    emailType: EmailTriggerType.MESSAGE_RECEIVED,
    referenceId: messageId,
    referenceType: "message",
    recipientId: recipientUserId,
    to: recipient.email,
    subject: "\uD83D\uDCAC You\u2019ve got a new message",
    type: "standard",
    variables: {
      title: "You\u2019ve got a new message",
      subtitle: "Someone sent you a message on Teevo.",
      body: "Open your conversation to view and reply.",
      hero_image,
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
    .select("conversation_id, conversations(listing_id)")
    .eq("id", offerId)
    .single();
  if (!conv) return;

  const { data: recipient } = await admin
    .from("users")
    .select("email")
    .eq("id", recipientUserId)
    .single();
  if (!recipient?.email) return;

  const conversationRel = conv.conversations as unknown;
  const conversation = (Array.isArray(conversationRel) ? conversationRel[0] : conversationRel) as {
    listing_id?: string | null;
  } | null;
  const { hero_image } = await getListingEmailContext(admin, conversation?.listing_id);

  const amountStr = amountPence != null ? ` \u00A3${(amountPence / 100).toFixed(2)}` : "";
  const subjects: Record<string, string> = {
    offer_made: "\uD83D\uDCB0 New offer on your listing!",
    offer_accepted: "\uD83C\uDF89 Your offer was accepted!",
    offer_declined: "\uD83D\uDC40 Your offer wasn\u2019t accepted",
    offer_countered: "\uD83E\uDD1D You\u2019ve got a counter offer",
  };
  const titles: Record<string, string> = {
    offer_made: "New offer on your listing",
    offer_accepted: "Your offer was accepted",
    offer_declined: "Your offer wasn\u2019t accepted",
    offer_countered: "You\u2019ve got a counter offer",
  };
  const bodies: Record<string, string> = {
    offer_made: `Someone made an offer${amountStr} on \u201C${listingTitle}\u201D.`,
    offer_accepted: `Your offer${amountStr} for \u201C${listingTitle}\u201D was accepted. Head to Teevo to complete your purchase.`,
    offer_declined: `Your offer for \u201C${listingTitle}\u201D wasn\u2019t accepted this time.`,
    offer_countered: `You received a counter offer${amountStr} for \u201C${listingTitle}\u201D.`,
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
    subject: subjects[eventType],
    type: "standard",
    variables: {
      title: titles[eventType],
      subtitle: bodies[eventType],
      body: "Open Teevo to view and respond.",
      hero_image,
      cta_link: `${APP_URL}/conversations/${conv.conversation_id}`,
      cta_text: "View offer",
    },
  });
}
