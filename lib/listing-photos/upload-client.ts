import { compressListingMain, compressListingThumb } from "@/lib/image-compression";
import type { PhotoSlot } from "@/lib/listing-photos/types";
import { PUBLIC_LISTINGS_BUCKET, VERIFICATION_LISTINGS_BUCKET } from "@/lib/listing-photos/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export type UploadableListingPhoto = {
  slot: PhotoSlot;
  file: File;
};

async function putSigned(path: string, token: string, bucket: string, blob: Blob, signal?: AbortSignal) {
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/upload/sign/${bucket}/${path}?token=${encodeURIComponent(token)}`;
  const formData = new FormData();
  formData.append("cacheControl", "3600");
  formData.append("", blob, path.split("/").pop() ?? "image.webp");
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: formData,
    headers: { "x-upsert": "true" },
    signal,
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText ? `${errText.slice(0, 100)}` : `Upload failed (${res.status}). Try again.`);
  }
}

export async function uploadListingPhotos(opts: {
  listingId: string;
  photos: UploadableListingPhoto[];
  hoselSerialStatus?: "uploaded" | "not_found" | "not_applicable" | null;
  signal?: AbortSignal;
  onProgress?: (current: number, total: number) => void;
}): Promise<void> {
  const { listingId, photos, hoselSerialStatus, signal, onProgress } = opts;
  if (!SUPABASE_URL) throw new Error("Missing Supabase URL");
  const total = photos.length + 2;
  onProgress?.(1, total);

  const urlsRes = await fetch(`/api/listings/${listingId}/upload-urls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      images: photos.map((p, i) => ({
        id: `${p.slot.key}-${i}`.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40),
        visibility: p.slot.visibility,
      })),
    }),
    signal,
  });
  const urlsData = await urlsRes.json().catch(() => ({}));
  if (!urlsRes.ok) throw new Error(urlsData.error ?? "Failed to get upload URLs");
  const uploads = urlsData.uploads as
    | { id: string; path: string; token: string; bucket: string }[]
    | undefined;
  if (!Array.isArray(uploads) || uploads.length !== photos.length * 2) {
    throw new Error("Invalid upload URLs response");
  }

  const allowedExt = ["jpg", "jpeg", "png", "gif", "webp"];
  const registered = [];

  for (let i = 0; i < photos.length; i++) {
    if (signal?.aborted) throw new Error("Upload cancelled");
    const { file, slot } = photos[i];
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    if (!file.size || !allowedExt.includes(ext)) {
      throw new Error("Please choose JPG, PNG, GIF or WebP photos.");
    }
    onProgress?.(2 + i, total);
    const [mainBlob, thumbBlob] = await Promise.all([
      compressListingMain(file),
      compressListingThumb(file),
    ]);
    const mainEntry = uploads[2 * i];
    const thumbEntry = uploads[2 * i + 1];
    const bucket =
      slot.visibility === "verification_only" ? VERIFICATION_LISTINGS_BUCKET : PUBLIC_LISTINGS_BUCKET;
    await putSigned(mainEntry.path, mainEntry.token, mainEntry.bucket || bucket, mainBlob, signal);
    await putSigned(thumbEntry.path, thumbEntry.token, thumbEntry.bucket || bucket, thumbBlob, signal);
    registered.push({
      path: mainEntry.path,
      slot_key: slot.key,
      image_type: slot.imageType,
      visibility: slot.visibility,
      is_required: slot.required,
      club_identifier: slot.clubIdentifier ?? null,
    });
  }

  onProgress?.(total, total);
  const imagesRes = await fetch(`/api/listings/${listingId}/images`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      images: registered,
      hosel_serial_status: hoselSerialStatus ?? null,
    }),
    signal,
  });
  const imagesData = await imagesRes.json().catch(() => ({}));
  if (!imagesRes.ok) throw new Error(imagesData.error ?? "Failed to save image list");
}
