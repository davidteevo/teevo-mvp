import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/listings/[id]/upload-urls
 * Body: JSON { count: number } (3–6)
 * Returns signed upload URLs so the client can upload without hitting Storage RLS.
 * Verifies listing belongs to the authenticated user.
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
    const count =
      typeof body.count === "number"
        ? body.count
        : parseInt(String(body.count), 10);
    if (!Number.isFinite(count) || count < 3 || count > 6) {
      return NextResponse.json(
        { error: "count must be 3–6" },
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

    const bucket = admin.storage.from("listings");
    const uploads: { path: string; token: string }[] = [];

    for (let i = 0; i < count; i++) {
      const path = `${listingId}/${i}.jpg`;
      const { data: signData, error: signErr } =
        await bucket.createSignedUploadUrl(path, { upsert: true });
      if (signErr || !signData?.token) {
        console.error("createSignedUploadUrl error:", signErr);
        return NextResponse.json(
          { error: signErr?.message ?? "Failed to create upload URL" },
          { status: 500 }
        );
      }
      uploads.push({ path, token: signData.token });
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
