"use client";

import posthog from "posthog-js";
import type { AllowedEventName } from "@/app/api/events/route";

const POSTHOG_EVENTS = new Set<AllowedEventName>([
  "seller_signup_complete",
  "seller_listing_started",
  "listing_submitted",
  "seller_listing_completed",
  "checkout_initiated",
  "watchlist_added",
  "watchlist_removed",
  "buyer_delivery_confirmed",
  "referral_link_shared",
  "creator_share_clicked",
  "founder_claim_clicked",
]);

const POSTHOG_PROPERTY_KEYS = new Set([
  "amount_pence",
  "campaign_type",
  "category",
  "channel",
  "claimed",
  "count",
  "entity_id",
  "entity_type",
  "founder_number",
  "hasUrl",
  "initiated_by",
  "listing_id",
  "listing_status",
  "listingId",
  "preselected_rating",
  "rating",
  "remaining",
  "source",
  "sticky",
  "transaction_id",
]);

type PostHogPropertyValue = string | number | boolean | null;

function posthogProperties(
  properties?: Record<string, unknown>
): Record<string, PostHogPropertyValue> {
  const approvedEntries = Object.entries(properties ?? {}).filter(
    (entry): entry is [string, PostHogPropertyValue] => {
      const [key, value] = entry;
      return (
        POSTHOG_PROPERTY_KEYS.has(key) &&
        (typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean" ||
          value === null)
      );
    }
  );

  return Object.fromEntries(approvedEntries);
}

/**
 * Fire an allowlisted client event to the app analytics endpoint and PostHog.
 * PostHog receives only explicitly approved, non-PII properties.
 */
export function track(
  name: AllowedEventName,
  properties?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;

  if (POSTHOG_EVENTS.has(name)) {
    try {
      posthog.capture(name, posthogProperties(properties));
    } catch {
      // Analytics must never interrupt the user action.
    }
  }

  fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, properties: properties ?? {} }),
  }).catch(() => {
    // Non-blocking; ignore network errors
  });
}
