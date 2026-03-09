import { createAdminClient } from "@/lib/supabase/admin";
import { getListingImageUrl } from "@/lib/listing-images";

export async function loadConversationPayload(
  conversationId: string,
  currentUserId: string
) {
  const admin = createAdminClient();
  const { data: conv, error: convErr } = await admin
    .from("conversations")
    .select("id, listing_id, buyer_id, seller_id, created_at, updated_at")
    .eq("id", conversationId)
    .single();

  if (convErr || !conv) return null;
  if (conv.buyer_id !== currentUserId && conv.seller_id !== currentUserId) {
    return null;
  }

  const { data: listingRow } = await admin
    .from("listings")
    .select("id, brand, model, price, status, condition, listing_images(storage_path, sort_order)")
    .eq("id", conv.listing_id)
    .single();
  const otherId = conv.buyer_id === currentUserId ? conv.seller_id : conv.buyer_id;
  const { data: otherUser } = await admin.from("users").select("chat_display_name, display_name").eq("id", otherId).single();
  const { data: sellerUser } = await admin.from("users").select("location").eq("id", conv.seller_id).single();
  const { data: messages } = await admin
    .from("messages")
    .select("id, sender_id, body, message_type, offer_id, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  const senderIds = Array.from(new Set((messages ?? []).map((m) => m.sender_id).filter(Boolean))) as string[];
  const senderList =
    senderIds.length > 0
      ? (await admin.from("users").select("id, chat_display_name, display_name").in("id", senderIds)).data ?? []
      : [];
  const senderMap = new Map(senderList.map((s) => [s.id, s.chat_display_name]));
  const senderDisplayNameMap = new Map(senderList.map((s) => [s.id, (s as { display_name?: string | null }).display_name?.trim() ?? null]));
  const { data: offers } = await admin
    .from("offers")
    .select("id, amount_pence, status, expires_at, counter_offer_id, created_at, buyer_id, seller_id, initiated_by")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false });

  const listingImages = (listingRow as { listing_images?: { storage_path: string; sort_order: number }[] } | null)?.listing_images ?? [];
  const firstImg = listingImages.sort((a, b) => a.sort_order - b.sort_order)[0];
  const listingPayload = listingRow
    ? {
        id: (listingRow as { id: string }).id,
        title: `${(listingRow as { brand: string }).brand} ${(listingRow as { model: string }).model}`,
        price: (listingRow as { price: number }).price,
        status: (listingRow as { status: string }).status,
        condition: (listingRow as { condition?: string }).condition ?? null,
        imageUrl: firstImg
          ? getListingImageUrl(firstImg.storage_path, "thumb", process.env.NEXT_PUBLIC_SUPABASE_URL)
          : null,
      }
    : null;

  const sellerLocation = (sellerUser as { location?: string } | null)?.location?.trim() ?? null;

  return {
    conversation: {
      id: conv.id,
      listingId: conv.listing_id,
      buyerId: conv.buyer_id,
      sellerId: conv.seller_id,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at,
    },
    listing: listingPayload,
    sellerLocation,
    otherPartyChatDisplayName: otherUser?.chat_display_name?.trim() ?? "Teevo user",
    otherPartyDisplayName: (otherUser as { display_name?: string | null } | null)?.display_name?.trim() ?? null,
    messages: (messages ?? []).map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      senderChatDisplayName: m.sender_id ? (senderMap.get(m.sender_id) ?? "Teevo user") : null,
      senderDisplayName: m.sender_id ? senderDisplayNameMap.get(m.sender_id) ?? null : null,
      body: m.body,
      messageType: m.message_type,
      offerId: m.offer_id,
      createdAt: m.created_at,
    })),
    offers: offers ?? [],
  };
}
