import type { AllowedEventName } from "@/app/api/events/route";

/**
 * Fire a tracking event. Events are allowlisted in POST /api/events.
 * Use for seller funnel: seller_signup_complete, seller_listing_started, seller_listing_published, etc.
 */
export function track(
  name: AllowedEventName,
  properties?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, properties: properties ?? {} }),
  }).catch(() => {
    // Non-blocking; ignore network errors
  });
}
