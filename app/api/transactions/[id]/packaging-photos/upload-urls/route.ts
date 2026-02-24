import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { FulfilmentStatus, PackagingStatus, PACKAGING_PHOTO_COUNT } from "@/lib/fulfilment";

const BUCKET = "packaging-photos";

export const dynamic = "force-dynamic";

/**
 * POST /api/transactions/[id]/packaging-photos/upload-urls
 * Body: { count?: number } (default 4)
 * Returns signed upload URLs. Seller only; requires packaging choice set; allows when PAID or REJECTED.
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
    const count =
      typeof body.count === "number" && body.count >= 3 && body.count <= 4
        ? body.count
        : PACKAGING_PHOTO_COUNT;

    const admin = createAdminClient();
    const { data: tx, error: txErr } = await admin
      .from("transactions")
      .select("id, seller_id, fulfilment_status, shipping_package, packaging_status")
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
        { error: "Choose packaging type first (Prepare your item for dispatch)" },
        { status: 400 }
      );
    }
    const fulfilmentStatus = tx.fulfilment_status ?? FulfilmentStatus.PAID;
    const packagingStatus = tx.packaging_status ?? null;
    if (
      packagingStatus === PackagingStatus.SUBMITTED ||
      packagingStatus === PackagingStatus.VERIFIED
    ) {
      return NextResponse.json(
        { error: packagingStatus === PackagingStatus.VERIFIED ? "Already verified" : "Already submitted for review" },
        { status: 400 }
      );
    }
    if (fulfilmentStatus !== FulfilmentStatus.PAID && fulfilmentStatus !== FulfilmentStatus.PACKAGING_SUBMITTED) {
      return NextResponse.json(
        { error: "Cannot upload packaging photos for this order state" },
        { status: 400 }
      );
    }

    const bucket = admin.storage.from(BUCKET);
    const uploads: { path: string; token: string }[] = [];

    for (let i = 0; i < count; i++) {
      const path = `${transactionId}/${i}.jpg`;
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
    console.error("Packaging upload-urls error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
