import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { FulfilmentStatus, PackagingStatus } from "@/lib/fulfilment";

/**
 * POST /api/transactions/[id]/packaging-photos/submit
 * Body: { paths: string[] } (3–4 storage paths from upload-urls + upload)
 * Saves packaging_photos, sets packaging_status = SUBMITTED, fulfilment_status = PACKAGING_SUBMITTED.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: transactionId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const rawPaths = body.paths;
    if (!Array.isArray(rawPaths) || rawPaths.length < 3 || rawPaths.length > 4) {
      return NextResponse.json(
        { error: "paths must be an array of 3–4 storage paths" },
        { status: 400 }
      );
    }
    const paths = rawPaths.filter((p: unknown) => typeof p === "string") as string[];
    if (paths.length < 3) {
      return NextResponse.json(
        { error: "At least 3 valid paths required" },
        { status: 400 }
      );
    }
    const prefix = `${transactionId}/`;
    if (paths.some((p) => !p.startsWith(prefix))) {
      return NextResponse.json({ error: "Invalid path(s)" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: tx, error: txErr } = await admin
      .from("transactions")
      .select("id, seller_id, shipping_package, packaging_status, fulfilment_status")
      .eq("id", transactionId)
      .single();

    if (txErr || !tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    if (tx.seller_id !== user.id) {
      return NextResponse.json({ error: "Not your sale" }, { status: 403 });
    }
    if (!tx.shipping_package) {
      return NextResponse.json(
        { error: "Choose packaging type first" },
        { status: 400 }
      );
    }
    const packagingStatus = tx.packaging_status ?? null;
    if (packagingStatus === PackagingStatus.SUBMITTED) {
      return NextResponse.json(
        { error: "Already submitted for review" },
        { status: 400 }
      );
    }
    if (packagingStatus === PackagingStatus.VERIFIED) {
      return NextResponse.json(
        { error: "Packaging already verified" },
        { status: 400 }
      );
    }

    await admin
      .from("transactions")
      .update({
        packaging_photos: paths,
        packaging_status: PackagingStatus.SUBMITTED,
        fulfilment_status: FulfilmentStatus.PACKAGING_SUBMITTED,
        packaging_review_notes: null,
        review_notes: null,
        reviewed_by: null,
        reviewed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Packaging submit error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
