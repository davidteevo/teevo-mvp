import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { loadConversationPayload } from "@/lib/conversation-loader";

export const dynamic = "force-dynamic";

/**
 * GET /api/conversations/[id]
 * Get one conversation with listing, messages, offers. Requester must be buyer or seller.
 */
export async function GET(
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

  const { id } = await params;
  const payload = await loadConversationPayload(id, user.id);
  if (!payload) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }
  return NextResponse.json(payload);
}
