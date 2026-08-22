/**
 * GET /api/listings/[id]/verification-images
 * Owner or admin: short-lived signed URLs for verification-only images.
 */
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { VERIFICATION_LISTINGS_BUCKET } from "@/lib/listing-photos/types";
import { getThumbStoragePath } from "@/lib/listing-images";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
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

    const admin = createAdminClient();
    const { data: listing } = await admin
      .from("listings")
      .select("id, user_id")
      .eq("id", listingId)
      .single();
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    if (listing.user_id !== user.id) {
      const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") {
        return NextResponse.json({ error: "Listing not found" }, { status: 404 });
      }
    }

    const { data: rows } = await admin
      .from("listing_images")
      .select("id, storage_path, image_type, sort_order, slot_key")
      .eq("listing_id", listingId)
      .eq("visibility", "verification_only")
      .order("sort_order");

    const bucket = admin.storage.from(VERIFICATION_LISTINGS_BUCKET);
    const images = [];
    for (const row of rows ?? []) {
      const { data: signed } = await bucket.createSignedUrl(row.storage_path, 3600);
      const thumbPath = getThumbStoragePath(row.storage_path);
      const { data: signedThumb } =
        thumbPath !== row.storage_path
          ? await bucket.createSignedUrl(thumbPath, 3600)
          : { data: signed };
      images.push({
        id: row.id,
        image_type: row.image_type,
        slot_key: row.slot_key,
        url: signed?.signedUrl ?? null,
        thumbUrl: signedThumb?.signedUrl ?? signed?.signedUrl ?? null,
      });
    }

    return NextResponse.json({ images });
  } catch (e) {
    console.error("verification-images GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong." },
      { status: 500 }
    );
  }
}
