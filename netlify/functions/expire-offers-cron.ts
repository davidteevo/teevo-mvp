/**
 * Netlify Scheduled Function: expires old offers directly in Supabase.
 * Schedule is set in netlify.toml. No need to call the Next.js API.
 * Requires env vars: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY.
 */
import { createClient } from "@supabase/supabase-js";

export default async (_req: Request) => {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "expire-offers-cron: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
    );
    return;
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const now = new Date().toISOString();
  const { data: expired, error } = await admin
    .from("offers")
    .update({ status: "expired", updated_at: now })
    .lt("expires_at", now)
    .eq("status", "pending")
    .select("id");
  if (error) {
    console.error("expire-offers-cron: DB error", error.message);
    return;
  }
  console.log("expire-offers-cron: OK expired=" + (expired?.length ?? 0));
};
