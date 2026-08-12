import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { PackagingSource, STARTER_PACK_EVENTS, trackServerEvent } from "@/lib/starter-pack";
import { notifyAdminStarterPackRequested } from "@/lib/fulfilment-emails";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/transactions/[id]/starter-pack/notify
 * Retry the admin fulfilment email if the original send failed.
 */
export async function POST(
  _request: Request,
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
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: tx, error: txErr } = await admin
      .from("transactions")
      .select(
        "id, seller_id, listing_id, packaging_source, box_type, packaging_requested_at, starter_pack_admin_notified_at"
      )
      .eq("id", transactionId)
      .single();

    if (txErr || !tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    if (tx.packaging_source !== PackagingSource.TEEVO_STARTER_PACK) {
      return NextResponse.json({ error: "Not a Starter Pack order" }, { status: 400 });
    }
    if (tx.starter_pack_admin_notified_at) {
      return NextResponse.json({ ok: true, already_notified: true });
    }

    const notified = await notifyAdminStarterPackRequested(admin, {
      transactionId,
      listingId: tx.listing_id,
      sellerId: tx.seller_id,
      boxType: tx.box_type,
      requestedAt: tx.packaging_requested_at ?? new Date().toISOString(),
    });

    if (!notified) {
      return NextResponse.json(
        { error: "Could not send admin notification. Check TEEVO_ADMIN_EMAILS." },
        { status: 502 }
      );
    }

    const now = new Date().toISOString();
    await admin
      .from("transactions")
      .update({ starter_pack_admin_notified_at: now, updated_at: now })
      .eq("id", transactionId);
    await trackServerEvent(admin, STARTER_PACK_EVENTS.ADMIN_NOTIFICATION_SENT, {
      userId: user.id,
      properties: { transaction_id: transactionId, retry: true },
    });

    return NextResponse.json({ ok: true, starter_pack_admin_notified_at: now });
  } catch (e) {
    console.error("Starter pack notify retry error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
