import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { FulfilmentStatus } from "@/lib/fulfilment";
import {
  notifyCarrierDelivered,
  notifyItemDispatched,
  notifyTrackingIssue,
} from "@/lib/notification-events";
import { NotificationType, resolveNotifications } from "@/lib/notifications";

/**
 * Shippo tracking webhook. When Shippo sends track_updated:
 * - IN_TRANSIT / TRANSIT → set fulfilment_status = SHIPPED, status = shipped, order_state = shipped, shipped_at
 * - DELIVERED → set fulfilment_status = DELIVERED, order_state = delivered, delivered_at
 * - FAILURE / RETURNED / UNKNOWN → admin tracking issue
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

const ISSUE_STATUSES = new Set(["FAILURE", "RETURNED", "UNKNOWN"]);

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
  const statusRaw =
    payload.data.tracking_status?.status ??
    payload.data.tracking_history?.[payload.data.tracking_history.length - 1]?.status;
  const status = typeof statusRaw === "string" ? statusRaw.toUpperCase().replace(/\s+/g, "_") : "";

  if (!status) {
    return NextResponse.json({ ok: true });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let query = admin
    .from("transactions")
    .select("id, fulfilment_status, status, order_state, buyer_id, seller_id, listing_id, shipped_at");
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

  await admin
    .from("transactions")
    .update({ tracking_status: status, tracking_updated_at: now, updated_at: now })
    .eq("id", tx.id);

  if (status === "IN_TRANSIT" || status === "TRANSIT") {
    await resolveNotifications(admin, {
      types: [NotificationType.TRACKING_ISSUE],
      entityId: tx.id,
    });
    if (tx.fulfilment_status !== FulfilmentStatus.SHIPPED && tx.fulfilment_status !== FulfilmentStatus.DELIVERED) {
      await admin
        .from("transactions")
        .update({
          status: "shipped",
          order_state: "shipped",
          fulfilment_status: FulfilmentStatus.SHIPPED,
          shipped_at: tx.shipped_at ?? now,
          tracking_status: status,
          tracking_updated_at: now,
          updated_at: now,
        })
        .eq("id", tx.id);
      if (tx.buyer_id && tx.seller_id) {
        await notifyItemDispatched(admin, {
          transactionId: tx.id,
          listingId: tx.listing_id,
          sellerId: tx.seller_id,
          buyerId: tx.buyer_id,
          fulfilmentMode: "shippo",
        });
      }
    }
  } else if (status === "DELIVERED") {
    await resolveNotifications(admin, {
      types: [NotificationType.TRACKING_ISSUE, NotificationType.DELIVERY_OVERDUE],
      entityId: tx.id,
    });
    if (tx.fulfilment_status !== FulfilmentStatus.DELIVERED) {
      await admin
        .from("transactions")
        .update({
          order_state: "delivered",
          fulfilment_status: FulfilmentStatus.DELIVERED,
          delivered_at: now,
          tracking_status: status,
          tracking_updated_at: now,
          updated_at: now,
        })
        .eq("id", tx.id);
      if (tx.buyer_id && tx.seller_id) {
        await notifyCarrierDelivered(admin, {
          transactionId: tx.id,
          listingId: tx.listing_id,
          sellerId: tx.seller_id,
          buyerId: tx.buyer_id,
        });
      }
    }
  } else if (ISSUE_STATUSES.has(status)) {
    await notifyTrackingIssue(admin, {
      transactionId: tx.id,
      listingId: tx.listing_id,
      trackingStatus: status,
    });
  }

  return NextResponse.json({ ok: true });
}
