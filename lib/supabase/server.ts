import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;

export async function createClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl) {
    throw new Error(
      "Supabase URL is missing. Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL in your environment (e.g. in Netlify env vars for app.teevohq.com)."
    );
  }
  if (!anonKey) {
    throw new Error(
      "Supabase anon key is missing. Set NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment (e.g. in Netlify env vars for app.teevohq.com)."
    );
  }
  const cookieStore = await cookies();
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
