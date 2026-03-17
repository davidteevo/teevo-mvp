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
    console.error("[set-password] Missing token_hash in URL");
    return NextResponse.redirect(errorPath);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    type: "recovery",
    token_hash,
  });

  if (error) {
    console.error("[set-password] verifyOtp failed:", error.message);
    return NextResponse.redirect(errorPath);
  }

  if (!data?.session) {
    console.error("[set-password] verifyOtp ok but no session in response");
    return NextResponse.redirect(errorPath);
  }

  const { error: setError } = await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
  if (setError) {
    console.error("[set-password] setSession after verifyOtp failed:", setError.message);
    return NextResponse.redirect(errorPath);
  }

  return NextResponse.redirect(resetPath);
}
