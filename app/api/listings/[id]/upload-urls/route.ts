/**
 * POST /api/listings/[id]/upload-urls
 * Body: { images: { id: string; visibility: 'public' | 'verification_only' }[] }
 * Returns signed upload URLs (main + thumb) for each image, same order.
 */
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { MAX_LISTING_IMAGES } from "@/lib/listing-photos/types";
import { imageBucketForVisibility } from "@/lib/listing-images";
import type { ListingImageVisibility } from "@/lib/listing-photos/types";

export const dynamic = "force-dynamic";

async function authorizeListing(listingId: string, userId: string) {
  const admin = createAdminClient();
  const { data: listing, error: listErr } = await admin
    .from("listings")
    .select("id, user_id")
    .eq("id", listingId)
    .single();
  if (listErr || !listing) return { admin, error: NextResponse.json({ error: "Listing not found" }, { status: 404 }) };
  const isOwner = listing.user_id === userId;
  if (!isOwner) {
    const { data: profile } = await admin.from("users").select("role").eq("id", userId).single();
    if (profile?.role !== "admin") {
      return { admin, error: NextResponse.json({ error: "Listing not found" }, { status: 404 }) };
    }
  }
  return { admin, error: null as NextResponse | null };
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
    let images: { id: string; visibility: ListingImageVisibility }[] = [];
    if (Array.isArray(body.images)) {
      images = body.images
        .map((row: { id?: unknown; visibility?: unknown }) => ({
          id: typeof row?.id === "string" ? row.id : "",
          visibility:
            row?.visibility === "verification_only" ? "verification_only" : ("public" as const),
        }))
        .filter((row: { id: string }) => row.id);
    } else {
      const count =
        typeof body.count === "number" ? body.count : parseInt(String(body.count), 10);
      if (!Number.isFinite(count) || count < 1 || count > MAX_LISTING_IMAGES) {
        return NextResponse.json(
          { error: `count must be 1–${MAX_LISTING_IMAGES}` },
          { status: 400 }
        );
      }
      images = Array.from({ length: count }, (_, i) => ({
        id: `legacy-${i}`,
        visibility: "public" as const,
      }));
    }

    if (images.length < 1 || images.length > MAX_LISTING_IMAGES) {
      return NextResponse.json(
        { error: `Need 1–${MAX_LISTING_IMAGES} images` },
        { status: 400 }
      );
    }

    const { admin, error } = await authorizeListing(listingId, user.id);
    if (error) return error;

    const uploads: { id: string; path: string; token: string; bucket: string }[] = [];

    for (const image of images) {
      const bucketName = imageBucketForVisibility(image.visibility);
      const bucket = admin.storage.from(bucketName);
      const fileId = image.id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || crypto.randomUUID();
      for (const suffix of ["-main.webp", "-thumb.webp"] as const) {
        const path = `${listingId}/${fileId}${suffix}`;
        const { data: signData, error: signErr } = await bucket.createSignedUploadUrl(path, {
          upsert: true,
        });
        if (signErr) {
          console.error("createSignedUploadUrl error:", signErr);
          return NextResponse.json(
            { error: signErr.message ?? "Failed to create upload URL" },
            { status: 500 }
          );
        }
        const token = signData?.token ?? (signData as { token?: string } | undefined)?.token;
        if (!token || typeof token !== "string") {
          return NextResponse.json(
            { error: "Failed to create upload URL (no token)" },
            { status: 500 }
          );
        }
        uploads.push({ id: image.id, path, token, bucket: bucketName });
      }
    }

    return NextResponse.json({ uploads });
  } catch (e) {
    console.error("Upload URLs POST error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong." },
      { status: 500 }
    );
  }
}
