/**
 * Helpers for listing image storage paths and public URLs.
 * Main images are stored (e.g. listingId/0-main.webp); thumb path is derived (-thumb.webp).
 * Legacy paths (e.g. listingId/0.jpg) have no thumb; use main for both.
 */

const LISTINGS_BUCKET = "listings";

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
    return storagePath.slice(0, -"-main.webp".length) + "-thumb.webp";
  }
  return storagePath;
}

/**
 * Build the public URL for a listing image.
 * @param storagePath - The stored path (main path, e.g. listingId/0-main.webp)
 * @param variant - 'main' for detail page, 'thumb' for grids (uses -thumb.webp when available)
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
