import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const BUCKET = "packaging-photos";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/transactions/[id]/packaging-photo/[index]
 * Streams one packaging photo for admin review. Avoids signed-URL 404s by using service role to download.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; index: string }> }
) {
  try {
    const { id: transactionId, index: indexStr } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const index = parseInt(indexStr, 10);
    if (!Number.isFinite(index) || index < 0) {
      return NextResponse.json({ error: "Invalid index" }, { status: 400 });
    }

    const { data: tx, error: txErr } = await admin
      .from("transactions")
      .select("id, packaging_photos")
      .eq("id", transactionId)
      .single();

    if (txErr || !tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const paths = Array.isArray(tx.packaging_photos) ? tx.packaging_photos : [];
    const path = paths[index];
    if (typeof path !== "string" || !path.trim()) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
    const prefix = `${transactionId}/`;
    if (!normalizedPath.startsWith(prefix)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const bucket = admin.storage.from(BUCKET);
    const { data: blob, error: downloadErr } = await bucket.download(normalizedPath);

    if (downloadErr || blob == null) {
      console.error("Packaging photo download error:", downloadErr);
      return NextResponse.json(
        { error: downloadErr?.message ?? "Failed to load photo" },
        { status: 404 }
      );
    }

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (e) {
    console.error("Admin packaging-photo proxy error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
