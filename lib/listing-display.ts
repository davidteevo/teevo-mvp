import type { Listing } from "@/types/database";
import {
  isClothingCategory,
  isAccessoriesCategory,
  normalizeListingTitleForCategory,
} from "@/lib/listing-categories";
import {
  buildListingTitleFromSpecs,
  type TitleBuildInput,
} from "@/lib/club-specs/payload";
import { isGolfEquipmentCategory } from "@/lib/club-specs/schemas";

export { buildListingTitleFromSpecs };
export type { TitleBuildInput };

/**
 * Display title for a listing: title if set, else built from structured fields or model.
 */
export function getListingDisplayTitle(listing: Listing): string {
  if (listing.title?.trim()) {
    return normalizeListingTitleForCategory(listing.title.trim(), listing.category);
  }
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
  if (isGolfEquipmentCategory(listing.category)) {
    return buildListingTitleFromSpecs({
      category: listing.category,
      brand: listing.brand,
      model: listing.model,
      handed: listing.handed,
      degree: listing.degree,
      shaft_flex: listing.shaft_flex,
      shaft: listing.shaft,
      listing_format: listing.listing_format,
      iron_number: listing.iron_number,
      set_composition: listing.set_composition,
      head_number: listing.head_number,
      club_length: listing.club_length,
      standard_spec_status: listing.standard_spec_status,
      clubs: listing.listing_clubs,
    });
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
