import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Server-side recovery: verify token_hash from generateLink (hashed_token) and set
 * session in cookies, then redirect to the reset-password page. Works with PKCE
 * and when email clients strip URL fragments.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const base = new URL(request.url).origin;
  const resetPath = `${base}/login/reset-password`;
  const errorPath = `${base}/login/reset-password?error=invalid_link`;

  if (!token_hash) {
    return NextResponse.redirect(errorPath);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type: "recovery",
    token_hash,
  });

  if (error) {
    return NextResponse.redirect(errorPath);
  }

  return NextResponse.redirect(resetPath);
}
