import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { OFFER_EXPIRY_HOURS } from "@/lib/messaging-constants";
import { sendOfferNotification } from "@/lib/messaging-email";
import { trackMessagingEvent } from "@/lib/messaging-metrics";
import { MessagingEventType } from "@/lib/messaging-metrics";

export const dynamic = "force-dynamic";

/**
 * POST /api/offers/[id]/counter
 * Body: { amountPence }
 * Seller sends a counter-offer. Creates a new offer row linked as counter; original marked as countered.
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
  const body = await request.json().catch(() => ({}));
  const amountPence = typeof body.amountPence === "number" ? body.amountPence : Number(body.amountPence);
  if (!Number.isInteger(amountPence) || amountPence <= 0) {
    return NextResponse.json({ error: "amountPence must be a positive integer" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: offer } = await admin
    .from("offers")
    .select("id, conversation_id, listing_id, buyer_id, seller_id, amount_pence, status, expires_at")
    .eq("id", offerId)
    .single();
  if (!offer || offer.seller_id !== user.id) {
    return NextResponse.json({ error: "Offer not found or you are not the seller" }, { status: 404 });
  }
  if (offer.status !== "pending") {
    return NextResponse.json({ error: "Offer is no longer pending" }, { status: 400 });
  }
  if (new Date(offer.expires_at) < new Date()) {
    await admin.from("offers").update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", offerId);
    return NextResponse.json({ error: "Offer has expired" }, { status: 400 });
  }

  const { data: listing } = await admin.from("listings").select("price, status").eq("id", offer.listing_id).single();
  if (!listing || listing.status !== "verified") {
    return NextResponse.json({ error: "Listing is no longer available" }, { status: 400 });
  }
  if (amountPence > listing.price) {
    return NextResponse.json({ error: "Counter offer cannot exceed listing price" }, { status: 400 });
  }
  if (amountPence <= offer.amount_pence) {
    return NextResponse.json({ error: "Counter offer must be higher than the buyer's offer" }, { status: 400 });
  }

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + OFFER_EXPIRY_HOURS);

  const { data: counterOffer, error: insertErr } = await admin
    .from("offers")
    .insert({
      conversation_id: offer.conversation_id,
      listing_id: offer.listing_id,
      buyer_id: offer.buyer_id,
      seller_id: offer.seller_id,
      amount_pence: amountPence,
      status: "pending",
      expires_at: expiresAt.toISOString(),
      initiated_by: "seller",
    })
    .select("id, amount_pence, status, expires_at, created_at")
    .single();
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  await admin
    .from("offers")
    .update({ status: "countered", counter_offer_id: counterOffer.id, updated_at: new Date().toISOString() })
    .eq("id", offerId);

  await admin.from("messages").insert({
    conversation_id: offer.conversation_id,
    sender_id: user.id,
    body: `Counter offer: £${(amountPence / 100).toFixed(2)}`,
    message_type: "offer_countered",
    offer_id: counterOffer.id,
  });
  await admin
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", offer.conversation_id);

  const { data: listingRow } = await admin.from("listings").select("brand, model").eq("id", offer.listing_id).single();
  const listingTitle = listingRow ? `${listingRow.brand} ${listingRow.model}` : "Listing";
  sendOfferNotification(counterOffer.id, "offer_countered", offer.buyer_id, listingTitle, amountPence).catch(() => {});
  trackMessagingEvent(admin, MessagingEventType.OFFER_COUNTERED, counterOffer.id, "offer", {
    previous_offer_id: offerId,
    amount_pence: amountPence,
  }).catch(() => {});

  return NextResponse.json({
    offer: {
      id: counterOffer.id,
      amountPence: counterOffer.amount_pence,
      status: counterOffer.status,
      expiresAt: counterOffer.expires_at,
      createdAt: counterOffer.created_at,
    },
    previousOfferId: offerId,
  });
}
