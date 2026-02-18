import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { FulfilmentStatus } from "@/lib/fulfilment";

/**
 * POST /api/transactions/[id]/verify-packaging
 * Seller confirms packaging is ready. Unlocks label creation (fulfilment_status = PACKAGING_VERIFIED).
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

    const admin = createAdminClient();
    const { data: tx, error: txErr } = await admin
      .from("transactions")
      .select("id, seller_id, fulfilment_status, shipping_package")
      .eq("id", transactionId)
      .single();

    if (txErr || !tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    if (tx.seller_id !== user.id) {
      return NextResponse.json({ error: "Not your sale" }, { status: 403 });
    }
    const status = tx.fulfilment_status ?? FulfilmentStatus.PAID;
    if (status !== FulfilmentStatus.PACKAGING_SUBMITTED) {
      return NextResponse.json(
        { error: status === FulfilmentStatus.PACKAGING_VERIFIED ? "Already verified" : "Submit packaging choice first" },
        { status: 400 }
      );
    }
    if (!tx.shipping_package) {
      return NextResponse.json({ error: "Submit packaging choice first" }, { status: 400 });
    }

    await admin
      .from("transactions")
      .update({
        fulfilment_status: FulfilmentStatus.PACKAGING_VERIFIED,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Verify packaging POST error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
