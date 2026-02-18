import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { FulfilmentStatus } from "@/lib/fulfilment";

/**
 * Shippo tracking webhook. When Shippo sends track_updated:
 * - IN_TRANSIT / TRANSIT → set fulfilment_status = SHIPPED, status = shipped, order_state = shipped, shipped_at
 * - DELIVERED → set fulfilment_status = DELIVERED, order_state = delivered
 *
 * Configure in Shippo API Portal → Webhooks: POST to https://YOUR_DOMAIN/api/webhooks/shippo
 * Event: track_updated. Until this is wired, sellers use manual "Mark as shipped".
 */

type ShippoTrackUpdatedPayload = {
  event: string;
  test?: boolean;
  data?: {
    tracking_number?: string;
    transaction?: string;
    tracking_status?: { status?: string };
    tracking_history?: Array<{ status?: string }>;
  };
};

export async function POST(request: Request) {
  let payload: ShippoTrackUpdatedPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.event !== "track_updated" || !payload.data) {
    return NextResponse.json({ ok: true });
  }

  const trackingNumber = payload.data.tracking_number;
  const shippoTransactionId = payload.data.transaction;
  const statusRaw = payload.data.tracking_status?.status ?? payload.data.tracking_history?.[payload.data.tracking_history.length - 1]?.status;
  const status = typeof statusRaw === "string" ? statusRaw.toUpperCase().replace(/\s+/g, "_") : "";

  if (!status) {
    return NextResponse.json({ ok: true });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let query = admin.from("transactions").select("id, fulfilment_status, status, order_state");
  if (shippoTransactionId) {
    query = query.eq("shippo_transaction_id", shippoTransactionId);
  } else if (trackingNumber) {
    query = query.eq("shippo_tracking_number", trackingNumber);
  } else {
    return NextResponse.json({ ok: true });
  }

  const { data: rows, error: findErr } = await query.limit(1);
  if (findErr || !rows?.length) {
    return NextResponse.json({ ok: true });
  }

  const tx = rows[0];
  const now = new Date().toISOString();

  if (status === "IN_TRANSIT" || status === "TRANSIT") {
    if (tx.fulfilment_status !== FulfilmentStatus.SHIPPED && tx.fulfilment_status !== FulfilmentStatus.DELIVERED) {
      await admin
        .from("transactions")
        .update({
          status: "shipped",
          order_state: "shipped",
          fulfilment_status: FulfilmentStatus.SHIPPED,
          shipped_at: now,
          updated_at: now,
        })
        .eq("id", tx.id);
    }
  } else if (status === "DELIVERED") {
    if (tx.fulfilment_status !== FulfilmentStatus.DELIVERED) {
      await admin
        .from("transactions")
        .update({
          order_state: "delivered",
          fulfilment_status: FulfilmentStatus.DELIVERED,
          updated_at: now,
        })
        .eq("id", tx.id);
    }
  }

  return NextResponse.json({ ok: true });
}
