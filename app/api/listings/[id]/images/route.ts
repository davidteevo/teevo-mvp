/**
 * POST /api/listings/[id]/images
 * Registers images after client uploads them to Storage.
 * Body: { images: RegisteredListingImage[], hosel_serial_status?: string }
 * Legacy: { paths: string[] }
 */
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import {
  parseHoselSerialStatus,
  validateRegisteredImages,
  type RegisteredListingImage,
} from "@/lib/listing-photos/validate";
import { PUBLIC_LISTINGS_BUCKET, VERIFICATION_LISTINGS_BUCKET } from "@/lib/listing-photos/types";
import { isGolfEquipmentCategory } from "@/lib/club-specs/schemas";

export const dynamic = "force-dynamic";

function validPathForListing(listingId: string, path: unknown): path is string {
  if (typeof path !== "string") return false;
  const prefix = `${listingId}/`;
  if (!path.startsWith(prefix) || path.length <= prefix.length) return false;
  const name = path.slice(prefix.length);
  return /\.(webp|jpg|jpeg|png|gif)$/i.test(name);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const admin = createAdminClient();
    const { data: listing, error: listErr } = await admin
      .from("listings")
      .select("id, user_id, category, listing_format, hosel_serial_status")
      .eq("id", listingId)
      .single();

    if (listErr || !listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    const isOwner = listing.user_id === user.id;
    if (!isOwner) {
      const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") {
        return NextResponse.json({ error: "Listing not found" }, { status: 404 });
      }
    }

    const isLegacyPaths = Array.isArray(body.paths) && !Array.isArray(body.images);
    let images: RegisteredListingImage[] = [];
    if (Array.isArray(body.images)) {
      images = body.images;
    } else if (isLegacyPaths) {
      images = body.paths.map((path: unknown, i: number) => ({
        path: String(path),
        slot_key: `legacy-${i}`,
        image_type: "legacy",
        visibility: "public",
        is_required: false,
      }));
    }

    for (const img of images) {
      if (!validPathForListing(listingId, img.path)) {
        return NextResponse.json(
          { error: "Invalid image path format; paths must be under this listing" },
          { status: 400 }
        );
      }
      if (img.visibility === "verification_only") {
        // path is still listingId/file; bucket is separate
      } else if (img.visibility === "public" || !img.visibility) {
        // public
      }
    }

    const { data: clubs } = await admin
      .from("listing_clubs")
      .select("degree")
      .eq("listing_id", listingId)
      .order("sort_order");
    const wedgeLofts = (clubs ?? [])
      .map((c) => (typeof c.degree === "string" ? c.degree : ""))
      .filter(Boolean);

    const hoselStatus =
      parseHoselSerialStatus(body.hosel_serial_status) ??
      (listing.hosel_serial_status as "uploaded" | "not_found" | "not_applicable" | null);

    const guided = isGolfEquipmentCategory(listing.category);
    if (guided && Array.isArray(body.images)) {
      const err = validateRegisteredImages({
        category: listing.category,
        listingFormat: listing.listing_format === "set" || listing.listing_format === "single"
          ? listing.listing_format
          : null,
        wedgeLofts,
        hoselSerialStatus: hoselStatus,
        images,
      });
      if (err) {
        return NextResponse.json({ error: err }, { status: 400 });
      }
    }

    if (isLegacyPaths) {
      const { data: existing } = await admin
        .from("listing_images")
        .select(
          "storage_path, image_type, visibility, is_required, club_identifier, slot_key, storage_bucket"
        )
        .eq("listing_id", listingId)
        .order("sort_order");
      const publicExisting = (existing ?? []).filter(
        (row) => row.visibility !== "verification_only"
      );
      const verificationExisting = (existing ?? []).filter(
        (row) => row.visibility === "verification_only"
      );
      const byPath = new Map(publicExisting.map((row) => [row.storage_path, row]));
      await admin.from("listing_images").delete().eq("listing_id", listingId);
      const publicRows = images.map((img, i) => {
        const prev = byPath.get(img.path);
        return {
          listing_id: listingId,
          sort_order: i,
          storage_path: img.path,
          image_type: prev?.image_type ?? img.image_type ?? "legacy",
          visibility: "public" as const,
          is_required: prev?.is_required ?? false,
          club_identifier: prev?.club_identifier ?? null,
          slot_key: prev?.slot_key ?? null,
          storage_bucket: prev?.storage_bucket ?? PUBLIC_LISTINGS_BUCKET,
        };
      });
      const verificationRows = verificationExisting.map((row, i) => ({
        listing_id: listingId,
        sort_order: publicRows.length + i,
        storage_path: row.storage_path,
        image_type: row.image_type,
        visibility: "verification_only" as const,
        is_required: row.is_required,
        club_identifier: row.club_identifier,
        slot_key: row.slot_key,
        storage_bucket: row.storage_bucket ?? VERIFICATION_LISTINGS_BUCKET,
      }));
      const { error: insertErr } = await admin
        .from("listing_images")
        .insert([...publicRows, ...verificationRows]);
      if (insertErr) {
        console.error("listing_images insert error:", insertErr);
        return NextResponse.json(
          { error: insertErr.message ?? "Failed to save image list" },
          { status: 500 }
        );
      }
      return NextResponse.json({ ok: true });
    }

    await admin.from("listing_images").delete().eq("listing_id", listingId);

    const rows = images.map((img, i) => {
      const visibility = img.visibility === "verification_only" ? "verification_only" : "public";
      return {
        listing_id: listingId,
        sort_order: i,
        storage_path: img.path,
        image_type: img.image_type ?? "legacy",
        visibility,
        is_required: img.is_required ?? false,
        club_identifier: img.club_identifier ?? null,
        slot_key: img.slot_key ?? null,
        storage_bucket:
          visibility === "verification_only" ? VERIFICATION_LISTINGS_BUCKET : PUBLIC_LISTINGS_BUCKET,
      };
    });
    const { error: insertErr } = await admin.from("listing_images").insert(rows);

    if (insertErr) {
      console.error("listing_images insert error:", insertErr);
      return NextResponse.json(
        { error: insertErr.message ?? "Failed to save image list" },
        { status: 500 }
      );
    }

    if (hoselStatus) {
      await admin
        .from("listings")
        .update({ hosel_serial_status: hoselStatus, updated_at: new Date().toISOString() })
        .eq("id", listingId);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Listings images POST error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong." },
      { status: 500 }
    );
  }
}
