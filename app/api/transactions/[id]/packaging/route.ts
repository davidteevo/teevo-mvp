import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import {
  ShippingPackage,
  type ShippingPackageType,
  BOX_TYPES,
  type BoxType,
  getBoxFeeGbp,
  FulfilmentStatus,
} from "@/lib/fulfilment";
import {
  PackagingSource,
  categoryToBoxType,
  hasSellerPostageAddress,
  isFreeStarterPackEnabled,
  STARTER_PACK_EVENTS,
  trackServerEvent,
} from "@/lib/starter-pack";
import {
  notifyAdminStarterPackRequested,
  notifySellerStarterPackRequested,
} from "@/lib/fulfilment-emails";

export const dynamic = "force-dynamic";

const PACKAGING_SELECT =
  "id, shipping_package, packaging_source, box_type, box_fee_gbp, packaging_requested_at, starter_pack_dispatched_at, fulfilment_status";

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
    const rawPackage = body.shipping_package ?? body.shippingPackage;
    const starterPackRequested = body.starter_pack === true;
    const validPackages: ShippingPackageType[] = [ShippingPackage.SELLER_PACKS, ShippingPackage.TEEVO_BOX];
    const shipping_package =
      typeof rawPackage === "string" && validPackages.includes(rawPackage as ShippingPackageType)
        ? (rawPackage as ShippingPackageType)
        : null;

    if (!shipping_package) {
      return NextResponse.json(
        { error: "Select packaging: SELLER_PACKS or TEEVO_BOX" },
        { status: 400 }
      );
    }
    if (starterPackRequested && shipping_package !== ShippingPackage.TEEVO_BOX) {
      return NextResponse.json(
        { error: "Starter Pack requires TEEVO_BOX" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const starterPackEnabled = await isFreeStarterPackEnabled(admin);

    const { data: tx, error: txErr } = await admin
      .from("transactions")
      .select("id, seller_id, listing_id, fulfilment_status, shipping_package, packaging_source, box_type, box_fee_gbp, packaging_requested_at, starter_pack_dispatched_at")
      .eq("id", transactionId)
      .single();

    if (txErr || !tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    if (tx.seller_id !== user.id) {
      return NextResponse.json({ error: "Not your sale" }, { status: 403 });
    }
    const status = tx.fulfilment_status ?? FulfilmentStatus.PAID;
    if (status !== FulfilmentStatus.PAID) {
      return NextResponse.json(
        { error: "Packaging already submitted for this order" },
        { status: 400 }
      );
    }
    if (tx.shipping_package) {
      if (starterPackRequested && tx.packaging_source === PackagingSource.TEEVO_STARTER_PACK) {
        return NextResponse.json({
          ok: true,
          already_requested: true,
          shipping_package: tx.shipping_package,
          packaging_source: tx.packaging_source,
          box_type: tx.box_type,
          box_fee_gbp: tx.box_fee_gbp,
          packaging_requested_at: tx.packaging_requested_at,
          starter_pack_dispatched_at: tx.starter_pack_dispatched_at,
          fulfilment_status: tx.fulfilment_status ?? FulfilmentStatus.PAID,
        });
      }
      return NextResponse.json(
        { error: "Packaging choice already set" },
        { status: 400 }
      );
    }

    if (starterPackRequested) {
      if (!starterPackEnabled) {
        return NextResponse.json(
          { error: "Starter Pack is not currently available" },
          { status: 400 }
        );
      }

      const { data: seller } = await admin
        .from("users")
        .select("address_line1, address_city, address_postcode, address_country")
        .eq("id", user.id)
        .single();
      if (!seller || !hasSellerPostageAddress(seller)) {
        return NextResponse.json(
          { error: "Add your postage address in Settings → Postage before requesting a Starter Pack." },
          { status: 400 }
        );
      }

      const { data: listing } = await admin
        .from("listings")
        .select("category")
        .eq("id", tx.listing_id)
        .single();
      const box_type = categoryToBoxType(listing?.category ?? null);
      const now = new Date().toISOString();

      const { data: updated, error: updateErr } = await admin
        .from("transactions")
        .update({
          shipping_package: ShippingPackage.TEEVO_BOX,
          box_type,
          box_fee_gbp: 0,
          packaging_source: PackagingSource.TEEVO_STARTER_PACK,
          packaging_requested_at: now,
          updated_at: now,
        })
        .eq("id", transactionId)
        .is("shipping_package", null)
        .select(PACKAGING_SELECT)
        .maybeSingle();

      if (updateErr) {
        console.error("Starter pack update error:", updateErr);
        return NextResponse.json(
          { error: updateErr.message ?? "Failed to save Starter Pack request" },
          { status: 500 }
        );
      }

      if (!updated) {
        const { data: existing } = await admin
          .from("transactions")
          .select(PACKAGING_SELECT)
          .eq("id", transactionId)
          .single();
        if (existing?.packaging_source === PackagingSource.TEEVO_STARTER_PACK) {
          return NextResponse.json({
            ok: true,
            already_requested: true,
            ...existing,
          });
        }
        return NextResponse.json(
          { error: "Packaging choice already set" },
          { status: 400 }
        );
      }

      await trackServerEvent(admin, STARTER_PACK_EVENTS.REQUESTED, {
        userId: user.id,
        properties: { transaction_id: transactionId, box_type },
      });

      await notifySellerStarterPackRequested(admin, {
        transactionId,
        listingId: tx.listing_id,
        sellerId: user.id,
      }).catch((e) => console.error("Seller starter-pack email failed", e));

      let adminNotifiedAt: string | null = null;
      try {
        const notified = await notifyAdminStarterPackRequested(admin, {
          transactionId,
          listingId: tx.listing_id,
          sellerId: user.id,
          boxType: box_type,
          requestedAt: now,
        });
        if (notified) {
          adminNotifiedAt = new Date().toISOString();
          await admin
            .from("transactions")
            .update({ starter_pack_admin_notified_at: adminNotifiedAt, updated_at: adminNotifiedAt })
            .eq("id", transactionId);
          await trackServerEvent(admin, STARTER_PACK_EVENTS.ADMIN_NOTIFICATION_SENT, {
            userId: user.id,
            properties: { transaction_id: transactionId },
          });
        }
      } catch (e) {
        console.error("Admin starter-pack email failed", e);
      }

      return NextResponse.json({
        ok: true,
        ...updated,
        starter_pack_admin_notified_at: adminNotifiedAt,
      });
    }

    if (shipping_package === ShippingPackage.TEEVO_BOX && starterPackEnabled) {
      return NextResponse.json(
        { error: "Paid packaging is not available while the Starter Pack offer is on" },
        { status: 400 }
      );
    }

    let box_type: BoxType | null = null;
    let box_fee_gbp: number | null = null;
    if (shipping_package === ShippingPackage.TEEVO_BOX) {
      const rawBox = body.box_type ?? body.boxType;
      if (typeof rawBox === "string" && (BOX_TYPES as readonly string[]).includes(rawBox)) {
        box_type = rawBox as BoxType;
        box_fee_gbp = getBoxFeeGbp(box_type);
      } else {
        return NextResponse.json(
          { error: "TEEVO_BOX requires box_type: DRIVER_BOX | IRON_SET_BOX | PUTTER_BOX | SMALL_BOX" },
          { status: 400 }
        );
      }
    }

    const packaging_source =
      shipping_package === ShippingPackage.TEEVO_BOX
        ? PackagingSource.TEEVO_PAID
        : PackagingSource.SELLER_OWN;
    const now = new Date().toISOString();

    const { data: updated, error: updateErr } = await admin
      .from("transactions")
      .update({
        shipping_package,
        box_type: box_type ?? null,
        box_fee_gbp: box_fee_gbp ?? null,
        packaging_source,
        packaging_requested_at: now,
        fulfilment_status: FulfilmentStatus.PACKAGING_SUBMITTED,
        updated_at: now,
      })
      .eq("id", transactionId)
      .is("shipping_package", null)
      .select(PACKAGING_SELECT)
      .maybeSingle();

    if (updateErr) {
      console.error("Packaging update error:", updateErr);
      return NextResponse.json(
        { error: updateErr.message ?? "Failed to save packaging choice" },
        { status: 500 }
      );
    }
    if (!updated) {
      return NextResponse.json(
        { error: "Packaging choice already set" },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, ...updated });
  } catch (e) {
    console.error("Packaging POST error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
