import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getOrCreateChatDisplayName } from "@/lib/chat-identity";
import { loadConversationPayload } from "@/lib/conversation-loader";
import { getListingImageUrl } from "@/lib/listing-images";
import { trackMessagingEvent } from "@/lib/messaging-metrics";
import { MessagingEventType } from "@/lib/messaging-metrics";

export const dynamic = "force-dynamic";

/**
 * GET /api/conversations
 * List current user's conversations (as buyer or seller). Optional ?listingId= to filter.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const listingId = searchParams.get("listingId");

  const admin = createAdminClient();
  let query = admin
    .from("conversations")
    .select(
      "id, listing_id, buyer_id, seller_id, created_at, updated_at, listings(id, brand, model, price, status, listing_images(storage_path, sort_order))"
    )
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order("updated_at", { ascending: false });

  if (listingId) {
    query = query.eq("listing_id", listingId);
  }

  const { data: conversations, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!conversations?.length) {
    return NextResponse.json({ conversations: [] });
  }

  const listingIds = Array.from(new Set(conversations.map((c) => c.listing_id)));
  const otherPartyIds = conversations.map((c) =>
    c.buyer_id === user.id ? c.seller_id : c.buyer_id
  );

  const { data: users } = await admin
    .from("users")
    .select("id, chat_display_name, display_name")
    .in("id", Array.from(new Set(otherPartyIds)));

  const userMap = new Map((users ?? []).map((u) => [u.id, u.chat_display_name]));
  const displayNameMap = new Map((users ?? []).map((u) => [u.id, (u as { display_name?: string | null }).display_name?.trim() ?? null]));

  const { data: lastMessages } = await admin
    .from("messages")
    .select("conversation_id, body, created_at")
    .in(
      "conversation_id",
      conversations.map((c) => c.id)
    )
    .order("created_at", { ascending: false });

  const lastByConv = new Map<string, { body: string | null; created_at: string }>();
  for (const m of lastMessages ?? []) {
    if (!lastByConv.has(m.conversation_id)) {
      lastByConv.set(m.conversation_id, { body: m.body, created_at: m.created_at });
    }
  }

  const list = conversations.map((c) => {
    const listing = c.listings as unknown as { id: string; brand: string; model: string; price: number; status: string; listing_images?: { storage_path: string; sort_order: number }[] } | null;
    const images = listing?.listing_images ?? [];
    const firstImage = images.sort((a, b) => a.sort_order - b.sort_order)[0];
    const title = listing ? `${listing.brand} ${listing.model}` : "";
    const imagePath = firstImage
      ? getListingImageUrl(firstImage.storage_path, "thumb", process.env.NEXT_PUBLIC_SUPABASE_URL)
      : null;
    const otherId = c.buyer_id === user.id ? c.seller_id : c.buyer_id;
    const last = lastByConv.get(c.id);
    return {
      id: c.id,
      listingId: c.listing_id,
      listingTitle: title,
      listingPrice: listing?.price ?? 0,
      listingImageUrl: imagePath,
      listingStatus: listing?.status ?? null,
      otherPartyChatDisplayName: userMap.get(otherId) ?? "Teevo user",
      otherPartyDisplayName: displayNameMap.get(otherId) ?? null,
      lastMessagePreview: last?.body?.slice(0, 80) ?? null,
      lastActivityAt: last?.created_at ?? c.updated_at,
      updatedAt: c.updated_at,
      isBuyer: c.buyer_id === user.id,
    };
  });

  return NextResponse.json({ conversations: list });
}

/**
 * POST /api/conversations
 * Body: { listingId }
 * Find or create conversation for (listing_id, current user as buyer). User must not be the seller.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const listingId = body.listingId ?? body.listing_id;
  if (!listingId || typeof listingId !== "string") {
    return NextResponse.json({ error: "listingId required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: listing, error: listErr } = await admin
    .from("listings")
    .select("id, user_id, status")
    .eq("id", listingId)
    .single();

  if (listErr || !listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (listing.user_id === user.id) {
    return NextResponse.json({ error: "You cannot start a conversation on your own listing" }, { status: 400 });
  }
  if (listing.status !== "verified") {
    return NextResponse.json({ error: "Listing is not available" }, { status: 400 });
  }

  await getOrCreateChatDisplayName(user.id);

  const { data: existing } = await admin
    .from("conversations")
    .select("id")
    .eq("listing_id", listingId)
    .eq("buyer_id", user.id)
    .single();

  if (existing) {
    await admin
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    const payload = await loadConversationPayload(existing.id, user.id);
    return NextResponse.json(payload ?? { conversation: null, listing: null, messages: [], offers: [], otherPartyChatDisplayName: null });
  }

  const { data: inserted, error: insertErr } = await admin
    .from("conversations")
    .insert({
      listing_id: listingId,
      buyer_id: user.id,
      seller_id: listing.user_id,
    })
    .select("id")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }
  trackMessagingEvent(admin, MessagingEventType.CONVERSATION_CREATED, inserted.id, "conversation", { listing_id: listingId }).catch(() => {});
  const payload = await loadConversationPayload(inserted.id, user.id);
  return NextResponse.json(payload ?? { conversation: null, listing: null, messages: [], offers: [], otherPartyChatDisplayName: null });
}
