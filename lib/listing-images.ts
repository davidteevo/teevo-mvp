/**
 * Helpers for listing image storage paths and public URLs.
 * Main images are stored (e.g. listingId/0-main.webp); thumb path is derived (-thumb.webp).
 * Legacy paths (e.g. listingId/0.jpg) have no thumb; use main for both.
 */

import {
  PUBLIC_LISTINGS_BUCKET,
  VERIFICATION_LISTINGS_BUCKET,
  type ListingImageMeta,
  type ListingImageVisibility,
} from "@/lib/listing-photos/types";

const LISTINGS_BUCKET = PUBLIC_LISTINGS_BUCKET;

export type ListingImageRow = {
  storage_path: string;
  sort_order?: number | null;
  visibility?: ListingImageVisibility | null;
  storage_bucket?: string | null;
  image_type?: string | null;
};

export function isPublicListingImage(image: {
  visibility?: ListingImageVisibility | string | null;
}): boolean {
  return image.visibility !== "verification_only";
}

export function publicListingImages<T extends { visibility?: ListingImageVisibility | string | null }>(
  images: T[] | null | undefined
): T[] {
  return (images ?? []).filter(isPublicListingImage);
}

export function sortListingImages<T extends { sort_order?: number | null }>(images: T[]): T[] {
  return [...images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

/** Return the main storage path as-is (main is what we store in listing_images). */
export function getMainStoragePath(storagePath: string): string {
  return storagePath;
}

/**
 * Return the thumbnail storage path.
 * If path ends with -main.webp, return path with -thumb.webp; else return path (legacy = no thumb).
 */
export function getThumbStoragePath(storagePath: string): string {
  if (storagePath.endsWith("-main.webp")) {
    return storagePath.slice(0, "-main.webp".length * -1) + "-thumb.webp";
  }
  return storagePath;
}

/**
 * Build the public URL for a listing image in the public listings bucket.
 */
export function getListingImageUrl(
  storagePath: string,
  variant: "main" | "thumb",
  baseUrl?: string
): string {
  const base = baseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const path = variant === "thumb" ? getThumbStoragePath(storagePath) : getMainStoragePath(storagePath);
  if (!base) return "";
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${LISTINGS_BUCKET}/${path}`;
}

export function listingImageDisplayUrl(
  image: Pick<ListingImageRow, "storage_path" | "storage_bucket" | "visibility">,
  variant: "main" | "thumb" = "main",
  signedVerificationUrl?: string | null
): string {
  if (image.visibility === "verification_only" || image.storage_bucket === VERIFICATION_LISTINGS_BUCKET) {
    return signedVerificationUrl ?? "";
  }
  return getListingImageUrl(image.storage_path, variant);
}

/** Public URL for the first listing image (thumb by default, for emails and cards). */
export function firstListingImageUrl(
  images: ListingImageRow[] | null | undefined,
  variant: "main" | "thumb" = "thumb"
): string | null {
  const sorted = sortListingImages(publicListingImages(images));
  const path = sorted[0]?.storage_path;
  if (!path) return null;
  const url = getListingImageUrl(path, variant);
  return url || null;
}

export function imageBucketForVisibility(visibility: ListingImageVisibility | null | undefined): string {
  return visibility === "verification_only" ? VERIFICATION_LISTINGS_BUCKET : PUBLIC_LISTINGS_BUCKET;
}

export type { ListingImageMeta };
