import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;

/**
 * Custom auth lock: skip Navigator LockManager (see @supabase/auth-js lib/locks.js).
 * Default navigatorLock() aborts after lockAcquireTimeout and rejects with
 * "AbortError: signal is aborted without reason", which Next surfaces as an unhandled runtime error
 * when concurrent auth work contends (e.g. sign-in + session refresh). @supabase/ssr uses a browser
 * singleton client, so cross-tab locking is an optional safeguard we can safely bypass here.
 */
async function authLockNoOp<T>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<T>
): Promise<T> {
  return fn();
}

export function createClient() {
  return createBrowserClient(supabaseUrl!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    ...(cookieDomain ? { cookieOptions: { domain: cookieDomain } } : {}),
    auth: {
      lock: authLockNoOp,
    },
  });
}
