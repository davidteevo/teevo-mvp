import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for server-side use (API routes, server components).
 * Use NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.
 */
export function createAdminClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // #region agent log
  try {
    fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "7a6302" },
      body: JSON.stringify({
        sessionId: "7a6302",
        location: "lib/supabase/admin.ts:createAdminClient",
        message: "admin client env",
        data: {
          hasUrl: !!supabaseUrl,
          hasServiceRoleKey: !!supabaseServiceRoleKey,
        },
        hypothesisId: "H1",
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch (_) {}
  // #endregion

  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is required");
  }
  if (!supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
}
