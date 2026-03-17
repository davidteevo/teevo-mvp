import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;

export function createClient() {
  // #region agent log
  const hasUrl = !!supabaseUrl;
  const hasAnon = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (typeof window !== "undefined") {
    fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "7a6302" },
      body: JSON.stringify({
        sessionId: "7a6302",
        location: "lib/supabase/client.ts:createClient",
        message: "browser supabase client config",
        data: { hasUrl, hasAnon },
        hypothesisId: "H2",
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }
  // #endregion
  return createBrowserClient(
    supabaseUrl!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    cookieDomain ? { cookieOptions: { domain: cookieDomain } } : {}
  );
}
