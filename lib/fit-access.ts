/**
 * Teevo Fit access.
 *
 * There is no beta-user allowlist. Authorised access is the existing admin
 * role, read on the server. `platform_settings.match_enabled` stays off and
 * must not be used to open the public fitting experience.
 *
 * Smallest later extension for selected participants:
 * 1. Store the allowlist server-side (a column on `users`, or a settings row).
 * 2. Teach `canAccessTeevoFit` to accept that server-read fact as well as admin.
 * 3. Use the same helper on `/fit` and before `/api/admin/match/recommend` runs.
 * Do not gate this in the client, and do not add a new public recommend API.
 */

export const TEEVO_FIT_NAME = "Teevo Fit";
export const TEEVO_FIT_PATH = "/fit";
export const LEGACY_MATCH_PATH = "/match";

export const FIT_NAV = {
  label: TEEVO_FIT_NAME,
  href: TEEVO_FIT_PATH,
  comingSoon: "Coming Soon",
} as const;

export const FIT_COMING_SOON = {
  heading: "Find your fit. Play your best.",
  description:
    "Meet Teevo Fit — a smarter way to find golf clubs suited to your game.",
  detail:
    "Tell us a little about how you play, and we'll help you discover equipment that could work for you.",
  status: "Coming Soon",
  cta: "Explore Clubs",
  ctaHref: "/",
} as const;

export function canAccessTeevoFit(role: string | null | undefined): boolean {
  return role === "admin";
}

/** Menu badge for people who can see Teevo Fit but cannot open the fitting flow. */
export function showTeevoFitComingSoon(role: string | null | undefined): boolean {
  return !canAccessTeevoFit(role);
}
