import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;

export async function createClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl) {
    const msg =
      "Supabase URL is missing. Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL in your environment (e.g. in Netlify env vars for app.teevohq.com).";
    console.error("[Supabase server]", msg);
    throw new Error(msg);
  }
  if (!anonKey) {
    const msg =
      "Supabase anon key is missing. Set NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment (e.g. in Netlify env vars for app.teevohq.com).";
    console.error("[Supabase server]", msg);
    throw new Error(msg);
  }
  let cookieStore;
  try {
    cookieStore = await cookies();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Supabase server] cookies() failed:", msg);
    throw new Error(`Server cookies unavailable: ${msg}`);
  }
  return createServerClient(
    supabaseUrl,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component
          }
        },
      },
      ...(cookieDomain ? { cookieOptions: { domain: cookieDomain } } : {}),
    }
  );
}
