import { getPhotoSlots } from "@/lib/listing-photos/requirements";
import {
  LISTING_IMAGE_TYPES,
  MAX_LISTING_IMAGES,
  MIN_GENERIC_LISTING_IMAGES,
  MAX_GENERIC_LISTING_IMAGES,
  type ListingImageType,
  type ListingImageVisibility,
} from "@/lib/listing-photos/types";
import { usesGuidedPhotos } from "@/lib/listing-photos/requirements";

export type RegisteredListingImage = {
  path: string;
  slot_key?: string | null;
  image_type?: string | null;
  visibility?: string | null;
  is_required?: boolean | null;
  club_identifier?: string | null;
};

export function isListingImageType(value: unknown): value is ListingImageType {
  return typeof value === "string" && (LISTING_IMAGE_TYPES as readonly string[]).includes(value);
}

export function parseHoselSerialStatus(value: unknown): "uploaded" | "not_found" | "not_applicable" | null {
  if (value === "uploaded" || value === "not_found" || value === "not_applicable") return value;
  return null;
}

export function validateListingImageCount(opts: {
  category: string;
  imageCount: number;
  listingFormat?: "single" | "set" | null;
  wedgeLofts?: string[];
  hoselSerialStatus?: "uploaded" | "not_found" | "not_applicable" | null;
}): string | null {
  const { category, imageCount, listingFormat, wedgeLofts, hoselSerialStatus } = opts;
  if (!Number.isFinite(imageCount) || imageCount < 1 || imageCount > MAX_LISTING_IMAGES) {
    return `Upload between 1 and ${MAX_LISTING_IMAGES} images`;
  }
  if (!usesGuidedPhotos(category)) {
    if (imageCount < MIN_GENERIC_LISTING_IMAGES || imageCount > MAX_GENERIC_LISTING_IMAGES) {
      return "Upload 5–6 images";
    }
    return null;
  }
  const slots = getPhotoSlots({
    category,
    listingFormat,
    wedgeLofts,
  });
  let required = slots.filter((s) => s.required).length;
  if (hoselSerialStatus === "not_found") {
    required = slots.filter((s) => s.required && !s.serialHelp).length;
  }
  if (imageCount < required) {
    return `Please add the required photos (${required} needed).`;
  }
  return null;
}

export function validateRegisteredImages(opts: {
  category: string;
  listingFormat?: "single" | "set" | null;
  wedgeLofts?: string[];
  hoselSerialStatus?: "uploaded" | "not_found" | "not_applicable" | null;
  images: RegisteredListingImage[];
}): string | null {
  if (opts.images.length > MAX_LISTING_IMAGES) {
    return `At most ${MAX_LISTING_IMAGES} images`;
  }
  if (!usesGuidedPhotos(opts.category)) {
    if (
      opts.images.length < MIN_GENERIC_LISTING_IMAGES ||
      opts.images.length > MAX_GENERIC_LISTING_IMAGES
    ) {
      return "Need 5–6 image paths";
    }
    return null;
  }
  const slots = getPhotoSlots({
    category: opts.category,
    listingFormat: opts.listingFormat,
    wedgeLofts: opts.wedgeLofts,
  });
  for (const slot of slots.filter((s) => s.required)) {
    if (slot.serialHelp && opts.hoselSerialStatus === "not_found") continue;
    const found = opts.images.find((img) => img.slot_key === slot.key);
    if (!found?.path) return `Missing required photo: ${slot.title}`;
    const vis = (found.visibility as ListingImageVisibility | null) ?? "public";
    if (slot.visibility === "verification_only" && vis !== "verification_only") {
      return "Serial photos must be stored as verification-only";
    }
  }
  return null;
}
