import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import {
  PackagingSource,
  STARTER_PACK_EVENTS,
  parseStarterPackTracking,
  trackServerEvent,
} from "@/lib/starter-pack";
import { notifySellerStarterPackDispatched } from "@/lib/fulfilment-emails";
import { notifyStarterPackDispatched } from "@/lib/notification-events";
import { syncDispatchClockById } from "@/lib/dispatch-deadline";
import { alreadyProcessedResponse } from "@/lib/admin-action-centre";
import { logAdminAction } from "@/lib/referral/admin-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/transactions/[id]/starter-pack/dispatch
 * Marks a Starter Pack as dispatched and stores inbound box tracking.
 * Also used to add/update tracking on an already-dispatched request.
 * Body: { courier, tracking_number, tracking_url }
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
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = parseStarterPackTracking(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const tracking = parsed.value;

    const { data: tx, error: txErr } = await admin
      .from("transactions")
      .select(
        "id, seller_id, listing_id, packaging_source, starter_pack_dispatched_at, starter_pack_courier, starter_pack_tracking_number, starter_pack_tracking_url"
      )
      .eq("id", transactionId)
      .single();

    if (txErr || !tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    if (tx.packaging_source !== PackagingSource.TEEVO_STARTER_PACK) {
      return NextResponse.json({ error: "Not a Starter Pack order" }, { status: 400 });
    }

    const alreadyDispatched = !!tx.starter_pack_dispatched_at;
    if (alreadyDispatched && body?.expect_undispatched === true) {
      return alreadyProcessedResponse();
    }
    const dispatchedAt = tx.starter_pack_dispatched_at ?? new Date().toISOString();
    const now = new Date().toISOString();

    const { error: updateErr } = await admin
      .from("transactions")
      .update({
        starter_pack_dispatched_at: dispatchedAt,
        starter_pack_courier: tracking.courier,
        starter_pack_tracking_number: tracking.tracking_number,
        starter_pack_tracking_url: tracking.tracking_url,
        updated_at: now,
      })
      .eq("id", transactionId)
      .eq("packaging_source", PackagingSource.TEEVO_STARTER_PACK);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    if (!alreadyDispatched) {
      await trackServerEvent(admin, STARTER_PACK_EVENTS.DISPATCHED, {
        userId: user.id,
        properties: {
          transaction_id: transactionId,
          courier: tracking.courier,
        },
      });
    }

    await notifySellerStarterPackDispatched(admin, {
      transactionId,
      listingId: tx.listing_id,
      sellerId: tx.seller_id,
      courier: tracking.courier,
      trackingNumber: tracking.tracking_number,
      trackingUrl: tracking.tracking_url,
    }).catch((e) => console.error("Seller starter-pack dispatched email failed", e));

    await notifyStarterPackDispatched(admin, {
      transactionId,
      sellerId: tx.seller_id,
      trackingUrl: tracking.tracking_url,
      trackingNumber: tracking.tracking_number,
      courier: tracking.courier,
    });

    await syncDispatchClockById(admin, transactionId);

    if (!alreadyDispatched) {
      await logAdminAction(admin, {
        adminId: user.id,
        action: "starter_pack_dispatched",
        targetType: "transaction",
        targetId: transactionId,
        payload: { courier: tracking.courier },
      });
    }

    return NextResponse.json({
      ok: true,
      already_dispatched: alreadyDispatched,
      starter_pack_dispatched_at: dispatchedAt,
      starter_pack_courier: tracking.courier,
      starter_pack_tracking_number: tracking.tracking_number,
      starter_pack_tracking_url: tracking.tracking_url,
    });
  } catch (e) {
    console.error("Starter pack dispatch error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
