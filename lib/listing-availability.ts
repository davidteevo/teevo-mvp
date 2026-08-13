import type { ListingStatus } from "@/types/database";

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

export function listingPurchaseApiError(
  status: string | null | undefined,
  notFoundMessage = "Listing not found or not available"
): { error: string; httpStatus: number } | null {
  if (!status) return { error: notFoundMessage, httpStatus: 404 };
  if (isComingSoonListing(status)) {
    return { error: LISTING_NOT_PURCHASABLE_YET, httpStatus: 400 };
  }
  if (!isPurchasableListingStatus(status)) {
    return { error: notFoundMessage, httpStatus: 404 };
  }
  return null;
}
