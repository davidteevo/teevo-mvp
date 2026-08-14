import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { FulfilmentStatus } from "@/lib/fulfilment";
import {
  FulfilmentMode,
  MANUAL_COURIERS,
  type ManualCourier,
} from "@/lib/fulfilment-providers";
import { ensureEmailSent, EmailTriggerType, getListingEmailContext } from "@/lib/email-triggers";
import { getAppUrl } from "@/lib/app-env";
import { notifyManualLabelReady } from "@/lib/notification-events";

export const dynamic = "force-dynamic";

const BUCKET = "shipping-labels";
const MAX_PDF_BYTES = 10 * 1024 * 1024;

/**
 * POST /api/admin/transactions/[id]/manual-label
 * multipart/form-data: courier, tracking_number, tracking_url, label (PDF file)
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

    const form = await request.formData();
    const courierRaw = String(form.get("courier") ?? "").trim();
    const trackingNumber = String(form.get("tracking_number") ?? "").trim();
    const trackingUrl = String(form.get("tracking_url") ?? "").trim();
    const labelFile = form.get("label");

    if (!MANUAL_COURIERS.includes(courierRaw as ManualCourier)) {
      return NextResponse.json(
        { error: `courier must be one of: ${MANUAL_COURIERS.join(", ")}` },
        { status: 400 }
      );
    }
    if (!trackingNumber) {
      return NextResponse.json({ error: "tracking_number is required" }, { status: 400 });
    }
    if (!trackingUrl) {
      return NextResponse.json({ error: "tracking_url is required" }, { status: 400 });
    }
    try {
      // eslint-disable-next-line no-new
      new URL(trackingUrl);
    } catch {
      return NextResponse.json({ error: "tracking_url must be a valid URL" }, { status: 400 });
    }
    if (!(labelFile instanceof File)) {
      return NextResponse.json({ error: "label PDF is required" }, { status: 400 });
    }
    if (labelFile.type && labelFile.type !== "application/pdf") {
      return NextResponse.json({ error: "label must be a PDF" }, { status: 400 });
    }
    if (labelFile.size > MAX_PDF_BYTES) {
      return NextResponse.json({ error: "label PDF must be under 10MB" }, { status: 400 });
    }

    const { data: tx, error: txErr } = await admin
      .from("transactions")
      .select(
        "id, seller_id, listing_id, fulfilment_mode, fulfilment_status, shipping_label_url"
      )
      .eq("id", transactionId)
      .single();

    if (txErr || !tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    if (tx.fulfilment_mode !== FulfilmentMode.MANUAL) {
      return NextResponse.json(
        { error: "This order is not in manual fulfilment mode" },
        { status: 400 }
      );
    }
    if (tx.fulfilment_status !== FulfilmentStatus.PACKAGING_VERIFIED) {
      return NextResponse.json(
        { error: "Packaging must be verified before providing a label" },
        { status: 400 }
      );
    }
    if (tx.shipping_label_url) {
      return NextResponse.json({ error: "A label has already been provided" }, { status: 400 });
    }

    const pdfBytes = Buffer.from(await labelFile.arrayBuffer());
    const storagePath = `${transactionId}/label.pdf`;
    const bucket = admin.storage.from(BUCKET);
    const { error: uploadErr } = await bucket.upload(storagePath, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (uploadErr) {
      console.error("shipping-labels upload error:", uploadErr);
      return NextResponse.json(
        { error: `Failed to upload label: ${uploadErr.message}` },
        { status: 500 }
      );
    }

    const { data: signed, error: signErr } = await bucket.createSignedUrl(storagePath, 60 * 60 * 24 * 7);
    if (signErr || !signed?.signedUrl) {
      return NextResponse.json(
        { error: signErr?.message ?? "Failed to create label URL" },
        { status: 500 }
      );
    }

    // Persist a stable path reference; signed URL is for email attachment fetch / short-term use.
    // Store the storage path as shipping_label_url so we can re-sign later if needed.
    const labelRef = `shipping-labels://${storagePath}`;

    const now = new Date().toISOString();
    const { error: updateErr } = await admin
      .from("transactions")
      .update({
        courier: courierRaw,
        tracking_number: trackingNumber,
        tracking_url: trackingUrl,
        shipping_label_url: labelRef,
        fulfilment_status: FulfilmentStatus.LABEL_CREATED,
        order_state: "label_created",
        label_created_at: now,
        updated_at: now,
      })
      .eq("id", transactionId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    const { data: seller } = await admin
      .from("users")
      .select("email")
      .eq("id", tx.seller_id)
      .single();
    const { itemName, hero_image } = await getListingEmailContext(admin, tx.listing_id);
    const orderShort = transactionId.slice(0, 8);
    const salesUrl = `${getAppUrl()}/dashboard/sales`;

    if (seller?.email) {
      await ensureEmailSent(admin, {
        emailType: EmailTriggerType.SHIPPING_LABEL_READY,
        referenceId: transactionId,
        recipientId: tx.seller_id,
        to: seller.email,
        subject: `Your Teevo shipping label is ready`,
        type: "transactional",
        variables: {
          title: "Your shipping label is ready",
          subtitle: "Print the attached label and prepare your parcel for dispatch.",
          body: [
            `Courier: ${courierRaw}`,
            `Tracking number: ${trackingNumber}`,
            ``,
            `Please print the attached shipping label, attach it securely to your parcel, then drop it off with the courier. When you've sent it, mark the order as shipped in your Sales dashboard.`,
          ].join("\n"),
          order_number: orderShort,
          item_name: itemName,
          hero_image,
          cta_link: trackingUrl || salesUrl,
          cta_text: "Track parcel",
        },
        attachments: [
          {
            filename: `teevo-shipping-label-${orderShort}.pdf`,
            content: pdfBytes,
            contentType: "application/pdf",
          },
        ],
      }).catch((e) => console.error("Shipping label ready email failed", e));
    }

    await notifyManualLabelReady(admin, {
      transactionId,
      listingId: tx.listing_id,
      sellerId: tx.seller_id,
    });

    return NextResponse.json({
      ok: true,
      courier: courierRaw,
      tracking_number: trackingNumber,
      tracking_url: trackingUrl,
      label_preview_url: signed.signedUrl,
    });
  } catch (e) {
    console.error("manual-label error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
