/**
 * Referral cookie helpers — kept separate from attribution so Edge middleware
 * does not pull server-only reward/email modules into its bundle.
 */

export const REF_COOKIE = "teevo_ref";
export const VISITOR_COOKIE = "teevo_vid";
export const REF_COOKIE_MAX_AGE_SECONDS = 60 * 24 * 60 * 60; // 60 days

export function referralCookieOptions(): {
  maxAge: number;
  sameSite: "lax";
  path: string;
  domain?: string;
} {
  const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;
  return {
    maxAge: REF_COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax",
    path: "/",
    ...(domain ? { domain } : {}),
  };
}
