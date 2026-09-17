/**
 * GET /api/admin/listings/[id]/photos/download
 * Zip of all listing photos (public + verification-only) for admin review.
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/referral/admin-auth";
import {
  PUBLIC_LISTINGS_BUCKET,
  VERIFICATION_LISTINGS_BUCKET,
} from "@/lib/listing-photos/types";
import { sortListingImages } from "@/lib/listing-images";
import { buildZipStore, type ZipStoreEntry } from "@/lib/zip-store";

export const dynamic = "force-dynamic";

type ImageRow = {
  storage_path: string;
  sort_order: number | null;
  image_type: string | null;
  visibility: string | null;
  slot_key: string | null;
  storage_bucket: string | null;
};

function extFromPath(path: string): string {
  const base = path.split("/").pop() ?? path;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "webp";
  return base.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") || "webp";
}

function sanitizeSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function zipEntryName(img: ImageRow, index: number, used: Set<string>): string {
  const folder = img.visibility === "verification_only" ? "verification" : "public";
  const label =
    sanitizeSegment(img.image_type || img.slot_key || "photo") || "photo";
  const ext = extFromPath(img.storage_path);
  const prefix = String(index + 1).padStart(2, "0");
  let name = `${folder}/${prefix}-${label}.${ext}`;
  let n = 2;
  while (used.has(name)) {
    name = `${folder}/${prefix}-${label}-${n}.${ext}`;
    n += 1;
  }
  used.add(name);
  return name;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params;
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    const { data: listing, error: listingErr } = await admin
      .from("listings")
      .select("id, brand, model, title")
      .eq("id", listingId)
      .maybeSingle();

    if (listingErr) {
      return NextResponse.json({ error: listingErr.message }, { status: 500 });
    }
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const { data: rows, error: imagesErr } = await admin
      .from("listing_images")
      .select("storage_path, sort_order, image_type, visibility, slot_key, storage_bucket")
      .eq("listing_id", listingId)
      .order("sort_order");

    if (imagesErr) {
      return NextResponse.json({ error: imagesErr.message }, { status: 500 });
    }

    const images = sortListingImages((rows ?? []) as ImageRow[]);
    if (images.length === 0) {
      return NextResponse.json({ error: "No photos on this listing" }, { status: 404 });
    }

    const entries: ZipStoreEntry[] = [];
    const usedNames = new Set<string>();
    const failures: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const bucketName =
        img.storage_bucket ||
        (img.visibility === "verification_only"
          ? VERIFICATION_LISTINGS_BUCKET
          : PUBLIC_LISTINGS_BUCKET);
      const { data: blob, error: downloadErr } = await admin.storage
        .from(bucketName)
        .download(img.storage_path);

      if (downloadErr || !blob) {
        failures.push(img.storage_path);
        console.error("listing photo download error:", img.storage_path, downloadErr);
        continue;
      }

      entries.push({
        name: zipEntryName(img, i, usedNames),
        data: new Uint8Array(await blob.arrayBuffer()),
      });
    }

    if (entries.length === 0) {
      return NextResponse.json(
        { error: "Could not load any listing photos", failures },
        { status: 502 }
      );
    }

    const zipBytes = buildZipStore(entries);
    const label =
      sanitizeSegment(
        [listing.brand, listing.model, listing.title].filter(Boolean).join("-") || "listing"
      ) || "listing";
    const filename = `teevo-${label}-${listingId.slice(0, 8)}-photos.zip`;

    return new NextResponse(Buffer.from(zipBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store, no-cache, max-age=0",
        ...(failures.length > 0
          ? { "X-Teevo-Photo-Failures": String(failures.length) }
          : {}),
      },
    });
  } catch (e) {
    console.error("admin listing photos download error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
