"use client";

import imageCompression from "browser-image-compression";

/** Main listing image: max 1600px width, WebP, ~75% quality. For detail page / buyer view. */
const MAIN_MAX_WIDTH = 1600;
const MAIN_QUALITY = 0.75;
const MAIN_MAX_SIZE_MB = 0.6;

/** Thumbnail: 400px width, WebP, ~78% quality. For grids only. */
const THUMB_MAX_WIDTH = 400;
const THUMB_QUALITY = 0.78;
const THUMB_MAX_SIZE_MB = 0.2;

/**
 * Compress a file to main listing image (1600px, WebP, ~75% quality, ~300–500KB target).
 * Used for the image buyers see on the listing detail page.
 */
export async function compressListingMain(file: File): Promise<Blob> {
  const options = {
    maxWidthOrHeight: MAIN_MAX_WIDTH,
    maxSizeMB: MAIN_MAX_SIZE_MB,
    initialQuality: MAIN_QUALITY,
    fileType: "image/webp" as const,
    useWebWorker: true,
    preserveExif: false,
  };
  const compressed = await imageCompression(file, options);
  return compressed;
}

/**
 * Compress a file to thumbnail (400px, WebP, ~78% quality, ~80–200KB target).
 * Used only in grids / cards; never on detail page.
 */
export async function compressListingThumb(file: File): Promise<Blob> {
  const options = {
    maxWidthOrHeight: THUMB_MAX_WIDTH,
    maxSizeMB: THUMB_MAX_SIZE_MB,
    initialQuality: THUMB_QUALITY,
    fileType: "image/webp" as const,
    useWebWorker: true,
    preserveExif: false,
  };
  const compressed = await imageCompression(file, options);
  return compressed;
}
