import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;

export function createClient() {
  return createBrowserClient(
    supabaseUrl!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    cookieDomain ? { cookieOptions: { domain: cookieDomain } } : {}
  );
}
