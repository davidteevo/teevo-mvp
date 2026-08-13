import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { PackagingSource, STARTER_PACK_EVENTS, trackServerEvent } from "@/lib/starter-pack";
import { notifySellerStarterPackDispatched } from "@/lib/fulfilment-emails";
import { notifyStarterPackDispatched } from "@/lib/notification-events";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/transactions/[id]/starter-pack/dispatch
 * Marks a Starter Pack as dispatched. Idempotent if already dispatched.
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
      .select("id, seller_id, listing_id, packaging_source, starter_pack_dispatched_at")
      .eq("id", transactionId)
      .single();

    if (txErr || !tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    if (tx.packaging_source !== PackagingSource.TEEVO_STARTER_PACK) {
      return NextResponse.json({ error: "Not a Starter Pack order" }, { status: 400 });
    }

    const alreadyDispatched = !!tx.starter_pack_dispatched_at;
    const dispatchedAt = tx.starter_pack_dispatched_at ?? new Date().toISOString();

    if (!alreadyDispatched) {
      const { error: updateErr } = await admin
        .from("transactions")
        .update({
          starter_pack_dispatched_at: dispatchedAt,
          updated_at: dispatchedAt,
        })
        .eq("id", transactionId)
        .eq("packaging_source", PackagingSource.TEEVO_STARTER_PACK)
        .is("starter_pack_dispatched_at", null);

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      await trackServerEvent(admin, STARTER_PACK_EVENTS.DISPATCHED, {
        userId: user.id,
        properties: { transaction_id: transactionId },
      });
    }

    await notifySellerStarterPackDispatched(admin, {
      transactionId,
      listingId: tx.listing_id,
      sellerId: tx.seller_id,
    }).catch((e) => console.error("Seller starter-pack dispatched email failed", e));

    await notifyStarterPackDispatched(admin, { transactionId });

    return NextResponse.json({
      ok: true,
      already_dispatched: alreadyDispatched,
      starter_pack_dispatched_at: dispatchedAt,
    });
  } catch (e) {
    console.error("Starter pack dispatch error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
