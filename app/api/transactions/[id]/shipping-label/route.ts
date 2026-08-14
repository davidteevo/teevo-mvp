import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import {
  addressFromUserProfile,
  addressFromBuyer,
  createShipmentAndPurchaseLabel,
  getParcelForPreset,
  ShippingService,
  type ShippingServiceType,
} from "@/lib/shippo";
import { FulfilmentStatus } from "@/lib/fulfilment";
import { notifyShippoLabelCreated, notifyShippoLabelFailed } from "@/lib/notification-events";
import { isCancellationBlockingDispatch, syncDispatchClockById } from "@/lib/dispatch-deadline";

export const dynamic = "force-dynamic";

/**
 * POST /api/transactions/[id]/shipping-label
 * Creates a Shippo shipping label for the transaction. Seller only.
 * Requires: seller has postage address set; buyer address was collected at checkout.
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
      .select("id, seller_id, listing_id, buyer_name, buyer_address_line1, buyer_address_line2, buyer_city, buyer_postcode, buyer_country, shippo_label_url, shipping_service, fulfilment_status, fulfilment_mode, cancellation_status, status")
      .eq("id", transactionId)
      .single();

    if (txErr || !tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    if (tx.seller_id !== user.id) {
      return NextResponse.json({ error: "Not your sale" }, { status: 403 });
    }
    if (tx.status !== "pending" || isCancellationBlockingDispatch(tx.cancellation_status)) {
      return NextResponse.json({ error: "This order can no longer be shipped" }, { status: 400 });
    }
    if (tx.fulfilment_mode === "manual") {
      return NextResponse.json(
        { error: "Shipping label will be prepared by Teevo. Please wait for your label email." },
        { status: 400 }
      );
    }
    if (tx.shippo_label_url) {
      return NextResponse.json(
        { error: "A label has already been created for this order" },
        { status: 400 }
      );
    }
    const fulfilmentStatus = tx.fulfilment_status ?? FulfilmentStatus.PAID;
    if (fulfilmentStatus !== FulfilmentStatus.PACKAGING_VERIFIED) {
      return NextResponse.json(
        { error: "Complete packaging and confirm ready to ship before creating a label." },
        { status: 400 }
      );
    }

    const { data: seller } = await admin
      .from("users")
      .select("address_line1, address_line2, address_city, address_postcode, address_country, display_name, first_name, surname")
      .eq("id", user.id)
      .single();

    const hasSellerAddress =
      seller?.address_line1 &&
      seller?.address_city &&
      seller?.address_postcode &&
      seller?.address_country;
    if (!hasSellerAddress) {
      return NextResponse.json(
        { error: "Add your postage address in Settings → Postage before creating a label." },
        { status: 400 }
      );
    }

    const hasBuyerAddress =
      tx.buyer_address_line1 &&
      tx.buyer_city &&
      tx.buyer_postcode &&
      tx.buyer_country;
    if (!hasBuyerAddress) {
      return NextResponse.json(
        { error: "Buyer shipping address is missing. New orders collect it at checkout; run the Shippo migration for existing data." },
        { status: 400 }
      );
    }

    const from = addressFromUserProfile({
      ...seller,
      address_line1: seller.address_line1!,
      address_city: seller.address_city!,
      address_postcode: seller.address_postcode!,
      address_country: seller.address_country!,
    });
    const to = addressFromBuyer({
      name: tx.buyer_name ?? "Buyer",
      address_line1: tx.buyer_address_line1!,
      address_line2: tx.buyer_address_line2 ?? undefined,
      address_city: tx.buyer_city!,
      address_postcode: tx.buyer_postcode!,
      address_country: tx.buyer_country!,
    });

    const { data: listing } = await admin
      .from("listings")
      .select("parcel_preset")
      .eq("id", tx.listing_id)
      .single();
    const parcel = getParcelForPreset(listing?.parcel_preset);

    const validServices: ShippingServiceType[] = [ShippingService.DPD_NEXT_DAY, ShippingService.DPD_SHIP_TO_SHOP];
    const preferredService =
      tx.shipping_service && validServices.includes(tx.shipping_service as ShippingServiceType)
        ? (tx.shipping_service as ShippingServiceType)
        : ShippingService.DPD_NEXT_DAY;

    let result;
    try {
      result = await createShipmentAndPurchaseLabel(from, to, { preferredService, parcel });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to create label";
      await notifyShippoLabelFailed(admin, {
        transactionId,
        listingId: tx.listing_id,
        errorMessage: message,
      });
      throw e;
    }

    const now = new Date().toISOString();
    await admin
      .from("transactions")
      .update({
        shippo_label_url: result.labelUrl,
        shippo_qr_code_url: result.qrCodeUrl ?? null,
        shippo_tracking_number: result.trackingNumber,
        shippo_transaction_id: result.shippoTransactionId,
        fulfilment_status: FulfilmentStatus.LABEL_CREATED,
        order_state: "label_created",
        label_created_at: now,
        updated_at: now,
      })
      .eq("id", transactionId);

    await notifyShippoLabelCreated(admin, {
      transactionId,
      listingId: tx.listing_id,
      sellerId: tx.seller_id,
    });

    await syncDispatchClockById(admin, transactionId);

    return NextResponse.json({
      labelUrl: result.labelUrl,
      qrCodeUrl: result.qrCodeUrl ?? undefined,
      trackingNumber: result.trackingNumber,
      trackingUrl: result.trackingUrl,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create label";
    console.error("Shippo shipping-label error:", e);
    // Shippo/address/parcel errors are user-actionable → 400; unexpected errors → 500
    const isShippoConfigError =
      message.includes("No shipping rates") ||
      message.includes("No allowlisted rate") ||
      message.includes("address is incomplete") ||
      message.includes("Parcel weight") ||
      message.includes("postage address");
    return NextResponse.json(
      { error: message },
      { status: isShippoConfigError ? 400 : 500 }
    );
  }
}
