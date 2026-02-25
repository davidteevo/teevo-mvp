import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/listings/[id]/images
 * Body: JSON { paths: string[] } — storage paths under listings bucket (e.g. "listing-uuid/0.jpg")
 * Registers images after client uploads them directly to Supabase Storage. Verifies listing belongs to user.
 */
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
    const paths = Array.isArray(body.paths) ? body.paths : [];
    if (paths.length < 3 || paths.length > 6) {
      return NextResponse.json({ error: "Need 3–6 image paths" }, { status: 400 });
    }

    // Validate every path: must be "listingId/filename" under this listing
    const prefix = `${listingId}/`;
    const validPaths = paths.filter(
      (p: unknown): p is string => typeof p === "string" && p.startsWith(prefix) && p.length > prefix.length
    );
    if (validPaths.length !== paths.length) {
      return NextResponse.json(
        { error: "Invalid image path format; paths must be under this listing" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: listing, error: listErr } = await admin
      .from("listings")
      .select("id, user_id")
      .eq("id", listingId)
      .single();

    if (listErr || !listing || listing.user_id !== user.id) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    await admin.from("listing_images").delete().eq("listing_id", listingId);

    const rows = validPaths.map((storage_path: string, i: number) => ({
      listing_id: listingId,
      sort_order: i,
      storage_path,
    }));
    const { error: insertErr } = await admin.from("listing_images").insert(rows);

    if (insertErr) {
      console.error("listing_images insert error:", insertErr);
      return NextResponse.json(
        { error: insertErr.message ?? "Failed to save image list" },
        { status: 500 }
      );
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
