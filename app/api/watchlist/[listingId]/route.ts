import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { removeWatchlistItem } from "@/lib/watchlist";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/watchlist/[listingId]
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ listingId: string }> }
) {
  const { listingId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const result = await removeWatchlistItem(admin, user.id, listingId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.httpStatus });
  }
  return NextResponse.json({ ok: true });
}
