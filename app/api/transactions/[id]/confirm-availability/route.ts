import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { AvailabilityConfirmationStatus } from "@/lib/dispatch-deadline";
import { resolveListingAvailabilityNotification } from "@/lib/dispatch-notifications";
import { notifyWatchersNowAvailable, notifyWatchersUnavailable } from "@/lib/watchlist-emails";
import { recordTransactionEvent, TransactionEventType } from "@/lib/transaction-events";
import { trackServerEvent } from "@/lib/starter-pack";

export const dynamic = "force-dynamic";

/**
 * POST /api/transactions/[id]/confirm-availability
 * After a dispatch-timeout cancellation, the seller confirms whether the listing is still for sale.
 * Body: { available: boolean }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (typeof body.available !== "boolean") {
    return NextResponse.json({ error: "Tell us whether the item is still available" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: tx } = await admin
    .from("transactions")
    .select("id, seller_id, listing_id, cancellation_reason, cancellation_status")
    .eq("id", id)
    .maybeSingle();

  if (!tx) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  if (tx.seller_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (tx.cancellation_status !== "completed") {
    return NextResponse.json({ error: "This order does not need availability confirmation" }, { status: 400 });
  }

  const { data: listing } = await admin
    .from("listings")
    .select("id, user_id, status, availability_confirmation_status, archived_at")
    .eq("id", tx.listing_id)
    .maybeSingle();

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (listing.availability_confirmation_status !== AvailabilityConfirmationStatus.REQUIRED) {
    return NextResponse.json({ error: "Availability has already been confirmed" }, { status: 400 });
  }

  const now = new Date().toISOString();
  if (body.available) {
    const { error } = await admin
      .from("listings")
      .update({
        status: "verified",
        archived_at: null,
        availability_confirmation_status: AvailabilityConfirmationStatus.CONFIRMED_AVAILABLE,
        updated_at: now,
      })
      .eq("id", listing.id)
      .eq("availability_confirmation_status", AvailabilityConfirmationStatus.REQUIRED);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await recordTransactionEvent(admin, {
      transactionId: id,
      eventType: TransactionEventType.LISTING_REACTIVATED,
      actorId: user.id,
      payload: { listing_id: listing.id },
    });
    await trackServerEvent(admin, "listing_availability_confirmed", {
      userId: user.id,
      properties: { transaction_id: id, listing_id: listing.id },
    });
    await notifyWatchersNowAvailable(admin, listing.id).catch((e) =>
      console.error("notifyWatchersNowAvailable failed", e)
    );
  } else {
    const { error } = await admin
      .from("listings")
      .update({
        archived_at: now,
        availability_confirmation_status: AvailabilityConfirmationStatus.CONFIRMED_UNAVAILABLE,
        updated_at: now,
      })
      .eq("id", listing.id)
      .eq("availability_confirmation_status", AvailabilityConfirmationStatus.REQUIRED);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await recordTransactionEvent(admin, {
      transactionId: id,
      eventType: TransactionEventType.LISTING_MARKED_UNAVAILABLE,
      actorId: user.id,
      payload: { listing_id: listing.id },
    });
    await trackServerEvent(admin, "listing_availability_unavailable", {
      userId: user.id,
      properties: { transaction_id: id, listing_id: listing.id },
    });
    await notifyWatchersUnavailable(admin, listing.id, "archived").catch((e) =>
      console.error("notifyWatchersUnavailable failed", e)
    );
  }

  await resolveListingAvailabilityNotification(admin, id);
  return NextResponse.json({ ok: true, available: body.available });
}
