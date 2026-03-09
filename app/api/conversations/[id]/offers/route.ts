import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { OFFER_EXPIRY_HOURS } from "@/lib/messaging-constants";
import { sendOfferNotification } from "@/lib/messaging-email";
import { trackMessagingEvent } from "@/lib/messaging-metrics";
import { MessagingEventType } from "@/lib/messaging-metrics";

export const dynamic = "force-dynamic";

/**
 * POST /api/conversations/[id]/offers
 * Body: { amountPence }
 * Buyer or seller creates an offer. Listing must be verified and not sold.
 * Seller can propose a price so the buyer can accept from the conversation.
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
  const amountPence = typeof body.amountPence === "number" ? body.amountPence : Number(body.amountPence);
  if (!Number.isInteger(amountPence) || amountPence <= 0) {
    return NextResponse.json({ error: "amountPence must be a positive integer" }, { status: 400 });
  }
  // #region agent log
  fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "1dbfd9" },
    body: JSON.stringify({
      sessionId: "1dbfd9",
      location: "app/api/conversations/[id]/offers/route.ts:POST-entry",
      message: "POST offers entered",
      data: { conversationId, amountPence },
      timestamp: Date.now(),
      hypothesisId: "H1",
    }),
  }).catch(() => {});
  // #endregion

  const admin = createAdminClient();
  const { data: conv } = await admin
    .from("conversations")
    .select("id, listing_id, buyer_id, seller_id")
    .eq("id", conversationId)
    .single();
  if (!conv) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }
  const isBuyer = conv.buyer_id === user.id;
  const isSeller = conv.seller_id === user.id;
  if (!isBuyer && !isSeller) {
    return NextResponse.json({ error: "You are not part of this conversation" }, { status: 404 });
  }

  const { data: listing } = await admin
    .from("listings")
    .select("id, price, status")
    .eq("id", conv.listing_id)
    .single();
  if (!listing || listing.status !== "verified") {
    return NextResponse.json({ error: "Listing is not available" }, { status: 400 });
  }
  if (amountPence > listing.price) {
    return NextResponse.json({ error: "Offer cannot exceed listing price" }, { status: 400 });
  }

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + OFFER_EXPIRY_HOURS);
  const initiatedBy = isBuyer ? "buyer" : "seller";
  // #region agent log
  fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "1dbfd9" },
    body: JSON.stringify({
      sessionId: "1dbfd9",
      location: "app/api/conversations/[id]/offers/route.ts:before-insert",
      message: "about to insert offer with initiated_by",
      data: { conversationId, initiatedBy },
      timestamp: Date.now(),
      hypothesisId: "H1",
    }),
  }).catch(() => {});
  // #endregion

  const { data: offer, error: offerErr } = await admin
    .from("offers")
    .insert({
      conversation_id: conversationId,
      listing_id: conv.listing_id,
      buyer_id: conv.buyer_id,
      seller_id: conv.seller_id,
      amount_pence: amountPence,
      status: "pending",
      expires_at: expiresAt.toISOString(),
      initiated_by: initiatedBy,
    })
    .select("id, amount_pence, status, expires_at, created_at")
    .single();

  if (offerErr) {
    // #region agent log
    fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "1dbfd9" },
      body: JSON.stringify({
        sessionId: "1dbfd9",
        location: "app/api/conversations/[id]/offers/route.ts:insert-error",
        message: "offer insert failed",
        data: { conversationId, errorMessage: offerErr.message, code: offerErr.code },
        timestamp: Date.now(),
        hypothesisId: "H1",
      }),
    }).catch(() => {});
    // #endregion
    return NextResponse.json({ error: offerErr.message }, { status: 500 });
  }

  await admin.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body: isSeller ? `Seller proposed £${(amountPence / 100).toFixed(2)}` : `Offer £${(amountPence / 100).toFixed(2)}`,
    message_type: "offer",
    offer_id: offer.id,
  });
  await admin
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  const { data: listingRow } = await admin.from("listings").select("brand, model").eq("id", conv.listing_id).single();
  const listingTitle = listingRow ? `${listingRow.brand} ${listingRow.model}` : "Listing";
  const recipientId = isBuyer ? conv.seller_id : conv.buyer_id;
  sendOfferNotification(offer.id, "offer_made", recipientId, listingTitle, amountPence).catch(() => {});
  trackMessagingEvent(admin, MessagingEventType.OFFER_MADE, offer.id, "offer", {
    conversation_id: conversationId,
    listing_id: conv.listing_id,
    amount_pence: amountPence,
    initiated_by: initiatedBy,
  }).catch(() => {});

  return NextResponse.json({
    offer: {
      id: offer.id,
      amountPence: offer.amount_pence,
      status: offer.status,
      expiresAt: offer.expires_at,
      createdAt: offer.created_at,
    },
  });
}
