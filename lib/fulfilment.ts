/**
 * Fulfilment and packaging constants. Buyer selects delivery; seller selects packaging.
 */

/** Shipping fee charged to buyer (flat rate MVP). */
export const SHIPPING_FEE_GBP = 9.49;

/** Fulfilment pipeline. Label creation allowed only when PACKAGING_VERIFIED. */
export const FulfilmentStatus = {
  PAID: "PAID",
  PACKAGING_SUBMITTED: "PACKAGING_SUBMITTED",
  PACKAGING_VERIFIED: "PACKAGING_VERIFIED",
  LABEL_CREATED: "LABEL_CREATED",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  COMPLETED: "COMPLETED",
} as const;
export type FulfilmentStatusType = (typeof FulfilmentStatus)[keyof typeof FulfilmentStatus];

/** Seller packaging choice. */
export const ShippingPackage = {
  SELLER_PACKS: "SELLER_PACKS",
  TEEVO_BOX: "TEEVO_BOX",
} as const;
export type ShippingPackageType = (typeof ShippingPackage)[keyof typeof ShippingPackage];

/** Teevo box types and fees (deducted from seller payout, not charged to buyer). */
export const BOX_TYPES = ["DRIVER_BOX", "IRON_SET_BOX", "PUTTER_BOX", "SMALL_BOX"] as const;
export type BoxType = (typeof BOX_TYPES)[number];

export const BOX_FEE_GBP: Record<BoxType, number> = {
  DRIVER_BOX: 4.99,
  IRON_SET_BOX: 4.99,
  PUTTER_BOX: 4.99,
  SMALL_BOX: 4.99,
};

export function getBoxFeeGbp(boxType: BoxType): number {
  return BOX_FEE_GBP[boxType] ?? 4.99;
}

/** Packaging photo review status (manual review MVP). */
export const PackagingStatus = {
  SUBMITTED: "SUBMITTED",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
} as const;
export type PackagingStatusType = (typeof PackagingStatus)[keyof typeof PackagingStatus];

/** Slots for packaging photos (seller must upload 3–4). */
export const PACKAGING_PHOTO_LABELS = [
  "Club condition",
  "Wrapped / protected",
  "Inside box",
  "Sealed box",
] as const;
export const PACKAGING_PHOTO_COUNT = 4;
