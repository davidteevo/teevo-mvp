import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { sendOfferNotification } from "@/lib/messaging-email";
import { trackMessagingEvent } from "@/lib/messaging-metrics";
import { MessagingEventType } from "@/lib/messaging-metrics";

export const dynamic = "force-dynamic";

/**
 * POST /api/offers/[id]/accept
 * Seller accepts the offer. Other pending offers in the conversation can be left as-is or marked declined; we leave them for simplicity (UI shows only latest/accepted).
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

  const { id: offerId } = await params;
  const admin = createAdminClient();
  const { data: offer } = await admin
    .from("offers")
    .select("id, conversation_id, listing_id, buyer_id, seller_id, amount_pence, status, expires_at")
    .eq("id", offerId)
    .single();
  if (!offer) {
    return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  }
  const isSeller = offer.seller_id === user.id;
  const isBuyer = offer.buyer_id === user.id;
  if (!isSeller && !isBuyer) {
    return NextResponse.json({ error: "You are not part of this offer" }, { status: 404 });
  }
  if (offer.status !== "pending") {
    return NextResponse.json({ error: "Offer is no longer pending" }, { status: 400 });
  }
  if (new Date(offer.expires_at) < new Date()) {
    await admin.from("offers").update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", offerId);
    return NextResponse.json({ error: "Offer has expired" }, { status: 400 });
  }

  const { data: listing } = await admin
    .from("listings")
    .select("status")
    .eq("id", offer.listing_id)
    .is("archived_at", null)
    .single();
  if (!listing || listing.status !== "verified") {
    return NextResponse.json({ error: "Listing is no longer available" }, { status: 400 });
  }

  const { error: updateErr } = await admin
    .from("offers")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", offerId);
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  await admin.from("messages").insert({
    conversation_id: offer.conversation_id,
    sender_id: user.id,
    body: `Offer of £${(offer.amount_pence / 100).toFixed(2)} accepted. Complete purchase below.`,
    message_type: "offer_accepted",
    offer_id: offerId,
  });
  await admin
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", offer.conversation_id);

  const recipientId = isSeller ? offer.buyer_id : offer.seller_id;
  const { data: listingRow } = await admin.from("listings").select("brand, model").eq("id", offer.listing_id).single();
  const listingTitle = listingRow ? `${listingRow.brand} ${listingRow.model}` : "Listing";
  sendOfferNotification(offerId, "offer_accepted", recipientId, listingTitle, offer.amount_pence).catch(() => {});
  trackMessagingEvent(admin, MessagingEventType.OFFER_ACCEPTED, offerId, "offer", {
    listing_id: offer.listing_id,
    amount_pence: offer.amount_pence,
  }).catch(() => {});

  return NextResponse.json({
    offer: { id: offerId, status: "accepted", amountPence: offer.amount_pence },
  });
}
