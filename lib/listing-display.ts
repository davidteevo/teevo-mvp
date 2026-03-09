import type { Listing } from "@/types/database";
import { isClothingCategory, isAccessoriesCategory } from "@/lib/listing-categories";

/**
 * Display title for a listing: title if set, else built from structured fields or model.
 */
export function getListingDisplayTitle(listing: Listing): string {
  if (listing.title?.trim()) return listing.title.trim();
  if (isClothingCategory(listing.category) && listing.item_type) {
    const parts = [listing.brand, listing.item_type];
    if (listing.size) parts.push(listing.size);
    return parts.join(" – ");
  }
  if (isAccessoriesCategory(listing.category) && listing.item_type) {
    const parts = [listing.brand, listing.item_type];
    if (listing.model?.trim()) parts.push(listing.model.trim());
    return parts.join(" – ");
  }
  return listing.model?.trim() || listing.brand || "Listing";
}

/**
 * Meta line for cards/detail: condition, optional colour (clothing). Handed is shown in spec line for clubs.
 */
export function getListingMetaParts(listing: Listing): string[] {
  const parts: string[] = [listing.condition];
  if (listing.colour?.trim()) parts.push(listing.colour.trim());
  return parts;
}
