import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/offers/[id]/withdraw
 * Buyer withdraws their offer.
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
    .select("id, conversation_id, buyer_id, amount_pence, status")
    .eq("id", offerId)
    .single();
  if (!offer || offer.buyer_id !== user.id) {
    return NextResponse.json({ error: "Offer not found or you are not the buyer" }, { status: 404 });
  }
  if (offer.status !== "pending") {
    return NextResponse.json({ error: "Offer is no longer pending" }, { status: 400 });
  }

  const { error: updateErr } = await admin
    .from("offers")
    .update({ status: "withdrawn", updated_at: new Date().toISOString() })
    .eq("id", offerId);
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  await admin.from("messages").insert({
    conversation_id: offer.conversation_id,
    sender_id: user.id,
    body: `Offer of £${(offer.amount_pence / 100).toFixed(2)} withdrawn.`,
    message_type: "offer_withdrawn",
    offer_id: offerId,
  });
  await admin
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", offer.conversation_id);

  return NextResponse.json({
    offer: { id: offerId, status: "withdrawn" },
  });
}
