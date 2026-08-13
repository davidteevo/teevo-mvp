import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications?filter=all|action|unread
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
  const filter = searchParams.get("filter") ?? "all";

  let query = supabase
    .from("notifications")
    .select(
      "id, type, title, message, entity_type, entity_id, action_url, action_label, requires_action, action_completed_at, read_at, metadata, created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (filter === "unread") {
    query = query.is("read_at", null);
  } else if (filter === "action") {
    query = query.eq("requires_action", true).is("action_completed_at", null);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notifications: data ?? [] });
}
