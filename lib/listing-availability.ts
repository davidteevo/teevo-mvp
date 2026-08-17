import type { ListingStatus } from "@/types/database";
import { AvailabilityConfirmationStatus } from "@/lib/dispatch-deadline";

/** Listings that appear in public marketplace discovery (not purchasable unless verified). */
export const PUBLIC_MARKETPLACE_STATUSES: readonly ListingStatus[] = ["pending", "verified"];

export type PublicMarketplaceStatus = (typeof PUBLIC_MARKETPLACE_STATUSES)[number];

export type MarketplaceListingStatus = "coming_soon" | "available";

export function isComingSoonListing(status: string): boolean {
  return status === "pending";
}

export function isPurchasableListingStatus(status: string): boolean {
  return status === "verified";
}

export function isPublicMarketplaceStatus(status: string): boolean {
  return status === "pending" || status === "verified";
}

export function marketplaceListingStatus(status: string): MarketplaceListingStatus {
  return isComingSoonListing(status) ? "coming_soon" : "available";
}

export const LISTING_NOT_PURCHASABLE_YET = "This club isn't available to purchase yet.";
export const LISTING_TEMPORARILY_UNAVAILABLE = "Temporarily unavailable";
export const LISTING_AWAITING_CONFIRMATION = "This item isn't currently available to purchase.";

export const LISTING_PURCHASE_SELECT =
  "id, user_id, price, status, archived_at, buying_paused, availability_confirmation_status";

export type ListingPurchaseFields = {
  status?: string | null;
  archived_at?: string | null;
  buying_paused?: boolean | null;
  availability_confirmation_status?: string | null;
};

export type ListingPurchaseBlockReason =
  | "coming_soon"
  | "paused"
  | "awaiting_confirmation"
  | "unavailable";

export function listingBlocksPurchase(
  listing: ListingPurchaseFields | null | undefined
): ListingPurchaseBlockReason | null {
  if (!listing) return "unavailable";
  if (listing.archived_at) return "unavailable";
  const status = listing.status ?? "";
  if (isComingSoonListing(status)) return "coming_soon";
  if (listing.buying_paused) return "paused";
  if (listing.availability_confirmation_status === AvailabilityConfirmationStatus.REQUIRED) {
    return "awaiting_confirmation";
  }
  if (!isPurchasableListingStatus(status)) return "unavailable";
  return null;
}

export function isListingPurchasable(
  listing: ListingPurchaseFields | null | undefined
): boolean {
  return listingBlocksPurchase(listing) === null;
}

export function listingPurchaseApiError(
  listing: ListingPurchaseFields | null | undefined,
  notFoundMessage = "Listing not found or not available"
): { error: string; httpStatus: number } | null {
  const reason = listingBlocksPurchase(listing);
  if (!reason) return null;
  if (reason === "coming_soon") {
    return { error: LISTING_NOT_PURCHASABLE_YET, httpStatus: 400 };
  }
  if (reason === "paused") {
    return { error: LISTING_TEMPORARILY_UNAVAILABLE, httpStatus: 400 };
  }
  if (reason === "awaiting_confirmation") {
    return { error: LISTING_AWAITING_CONFIRMATION, httpStatus: 400 };
  }
  return { error: notFoundMessage, httpStatus: 404 };
}

export function buyerPurchaseBlockCopy(reason: ListingPurchaseBlockReason | null): {
  title: string;
  body?: string;
} | null {
  if (!reason) return null;
  if (reason === "coming_soon") {
    return {
      title: "Coming Soon",
      body: "This club isn't available to buy just yet. Check back soon.",
    };
  }
  if (reason === "paused") {
    return { title: "Temporarily unavailable" };
  }
  if (reason === "awaiting_confirmation") {
    return {
      title: "Availability being confirmed",
      body: "We're checking with the seller that this item is still available.",
    };
  }
  return null;
}
