/**
 * Teevo Fit access.
 *
 * There is no beta-user allowlist. Authorised access is the existing admin
 * role, read on the server. `platform_settings.match_enabled` controls the
 * Coming Soon label in navigation. Turning it on does not open Teevo Fit
 * to the public.
 *
 * Smallest later extension for selected participants:
 * 1. Store the allowlist server-side (a column on `users`, or a settings row).
 * 2. Teach `canAccessTeevoFit` to accept that server-read fact as well as admin.
 * 3. Use the same helper on `/fit` and before `/api/admin/match/recommend` runs.
 * Do not gate this in the client, and do not add a new public recommend API.
 */

export const TEEVO_FIT_NAME = "Teevo Fit";
export const TEEVO_FIT_PATH = "/fit";
export const TEEVO_FIT_RESULTS_PATH = "/fit/results";
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
  drivers: "We're starting with drivers.",
  detail:
    "Tell us a little about how you play, and we'll help you discover a driver that could work for you.",
  status: "Coming Soon",
  cta: "Explore Clubs",
  ctaHref: "/",
} as const;

export function canAccessTeevoFit(role: string | null | undefined): boolean {
  return role === "admin";
}

/**
 * Coming Soon label for the hamburger menu and dashboard.
 * Shown when Teevo Fit is disabled in admin settings, and for anyone
 * who cannot open the fitting flow.
 */
export function showTeevoFitComingSoon(
  role: string | null | undefined,
  fitEnabled: boolean
): boolean {
  if (!fitEnabled) return true;
  return !canAccessTeevoFit(role);
}
