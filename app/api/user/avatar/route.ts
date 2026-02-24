import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const BUCKET = "avatars";
const EXPIRY_SEC = 3600;

export const dynamic = "force-dynamic";

/**
 * GET /api/user/avatar
 * Redirects to a signed URL for the current user's profile photo.
 * Use this as img src so avatars work with private buckets and same-origin cookies.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse(null, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("users")
    .select("avatar_path")
    .eq("id", user.id)
    .single();

  if (error || !row?.avatar_path) {
    return new NextResponse(null, { status: 404 });
  }

  const { data: signData, error: signErr } = await admin
    .storage
    .from(BUCKET)
    .createSignedUrl(row.avatar_path, EXPIRY_SEC);

  if (signErr || !signData?.signedUrl) {
    return new NextResponse(null, { status: 500 });
  }

  const res = NextResponse.redirect(signData.signedUrl, { status: 302 });
  // Prevent caching the redirect so the browser always gets a fresh signed URL (avoids expired URL on reload)
  res.headers.set("Cache-Control", "private, no-store, no-cache, max-age=0");
  res.headers.set("Pragma", "no-cache");
  return res;
}
