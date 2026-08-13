import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/notifications/read
 * Body: { ids?: string[], all?: true }
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
  const markAll = body.all === true;
  const ids = Array.isArray(body.ids)
    ? (body.ids as unknown[]).filter((id): id is string => typeof id === "string")
    : [];

  if (!markAll && !ids.length) {
    return NextResponse.json({ error: "ids or all required" }, { status: 400 });
  }

  const { data, error } = markAll
    ? await supabase.rpc("mark_all_notifications_read")
    : await supabase.rpc("mark_notifications_read", { p_ids: ids });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated: data ?? 0 });
}
