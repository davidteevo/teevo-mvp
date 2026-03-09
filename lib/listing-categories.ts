/**
 * Centralised listing categories, types, brands, sizes and conditions
 * for clubs, clothing and accessories. Used by sell form, API and filters.
 */

export const CLUB_CATEGORIES = [
  "Driver",
  "Woods",
  "Irons",
  "Wedges",
  "Putter",
  "Bag",
] as const;

export const CLOTHING_CATEGORY = "Clothing" as const;
export const ACCESSORIES_CATEGORY = "Accessories" as const;

export const APPAREL_LEGACY = "Apparel" as const;

/** All primary categories: clubs, legacy Apparel, Clothing, Accessories */
export const ALL_CATEGORIES = [
  ...CLUB_CATEGORIES,
  APPAREL_LEGACY,
  CLOTHING_CATEGORY,
  ACCESSORIES_CATEGORY,
] as const;

export type ClubCategory = (typeof CLUB_CATEGORIES)[number];
export type PrimaryCategory = (typeof ALL_CATEGORIES)[number];

/** Clothing types (item_type when category is Clothing) */
export const CLOTHING_TYPES = [
  "Polo",
  "Quarter Zip",
  "Jacket",
  "Waterproof Jacket",
  "Trousers",
  "Shorts",
  "Shoes",
  "Hat / Cap",
  "Belt",
  "Gloves",
  "Mid Layers",
  "Socks",
  "Other",
] as const;

/** Accessory/equipment types (item_type when category is Accessories) */
export const ACCESSORY_ITEM_TYPES = [
  "Range Finder",
  "Golf Bag",
  "Headcover",
  "Towel",
  "Ball Markers",
  "Alignment Sticks",
  "Training Aids",
  "Divot Tool",
  "Umbrella",
  "Other Accessories",
] as const;

/** Clothing brands */
export const CLOTHING_BRANDS = [
  "Nike",
  "Adidas",
  "FootJoy",
  "Lululemon",
  "Peter Millar",
  "RLX",
  "J Lindeberg",
  "TravisMathew",
  "Puma",
  "Under Armour",
  "Other",
] as const;

/** Accessory/equipment brands */
export const ACCESSORY_BRANDS = [
  "Bushnell",
  "Garmin",
  "Shot Scope",
  "Titleist",
  "TaylorMade",
  "Ping",
  "Scotty Cameron",
  "Callaway",
  "Other",
] as const;

/** General apparel sizes (non-shoes) */
export const SIZES_GENERAL = ["XS", "S", "M", "L", "XL", "XXL"] as const;

/** UK shoe sizes */
export const SIZES_SHOES_UK = ["6", "7", "8", "9", "10", "11", "12", "13"] as const;

/** Clothing type slug that uses shoe sizes */
export const CLOTHING_TYPE_SHOES = "Shoes";

/** All sizes for dropdown when type is unknown (e.g. filters) */
export const SIZES_ALL = [...SIZES_GENERAL, ...SIZES_SHOES_UK];

/** Get size options for a clothing type */
export function getSizeOptionsForClothingType(
  clothingType: string
): readonly string[] {
  if (clothingType === CLOTHING_TYPE_SHOES) {
    return SIZES_SHOES_UK;
  }
  return SIZES_GENERAL;
}

/** All conditions (unified for clubs, clothing, accessories) */
export const CONDITIONS = [
  "New",
  "New with tags",
  "New without tags",
  "Excellent",
  "Good",
  "Used",
  "Fair",
] as const;

export type ListingConditionValue = (typeof CONDITIONS)[number];

/** Whether category is clothing (structured path) */
export function isClothingCategory(category: string): boolean {
  return category === CLOTHING_CATEGORY;
}

/** Whether category is accessories (structured path) */
export function isAccessoriesCategory(category: string): boolean {
  return category === ACCESSORIES_CATEGORY;
}

/** Whether category uses item_type/size (Clothing or Accessories) */
export function isStructuredCategory(category: string): boolean {
  return isClothingCategory(category) || isAccessoriesCategory(category);
}

/** Whether category is a club (Driver, Woods, Irons, Wedges, Putter) */
export function isClubCategory(category: string): boolean {
  return CLUB_CATEGORIES.includes(category as ClubCategory);
}
