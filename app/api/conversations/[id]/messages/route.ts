import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { isMessageBlocked, getBlockReason } from "@/lib/message-filter";
import { getOrCreateChatDisplayName } from "@/lib/chat-identity";
import { sendNewMessageNotification } from "@/lib/messaging-email";
import { trackMessagingEvent } from "@/lib/messaging-metrics";
import { MessagingEventType } from "@/lib/messaging-metrics";

export const dynamic = "force-dynamic";

/**
 * POST /api/conversations/[id]/messages
 * Body: { body }
 * Send a text message. Message filter blocks off-platform contact info.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: conversationId } = await params;
  const body = await request.json().catch(() => ({}));
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "body required" }, { status: 400 });
  }

  if (isMessageBlocked(text)) {
    return NextResponse.json({ error: getBlockReason() }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: conv } = await admin
    .from("conversations")
    .select("id, buyer_id, seller_id")
    .eq("id", conversationId)
    .single();
  if (!conv || (conv.buyer_id !== user.id && conv.seller_id !== user.id)) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const { data: inserted, error } = await admin.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body: text,
    message_type: "text",
  }).select("id, sender_id, body, message_type, created_at").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  const otherPartyId = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id;
  sendNewMessageNotification(conversationId, inserted.id, otherPartyId).catch(() => {});
  trackMessagingEvent(admin, MessagingEventType.MESSAGE_SENT, inserted.id, "message", { conversation_id: conversationId }).catch(() => {});

  const chatDisplayName = await getOrCreateChatDisplayName(user.id);
  return NextResponse.json({
    message: {
      id: inserted.id,
      senderId: inserted.sender_id,
      senderChatDisplayName: chatDisplayName,
      body: inserted.body,
      messageType: inserted.message_type,
      createdAt: inserted.created_at,
    },
  });
}
