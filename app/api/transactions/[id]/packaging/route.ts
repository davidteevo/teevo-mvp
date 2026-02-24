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

export const dynamic = "force-dynamic";

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
    if (status !== FulfilmentStatus.PAID) {
      return NextResponse.json(
        { error: "Packaging already submitted for this order" },
        { status: 400 }
      );
    }
    if (tx.shipping_package) {
      return NextResponse.json(
        { error: "Packaging choice already set" },
        { status: 400 }
      );
    }

    await admin
      .from("transactions")
      .update({
        shipping_package,
        box_type: box_type ?? null,
        box_fee_gbp: box_fee_gbp ?? null,
        fulfilment_status: FulfilmentStatus.PACKAGING_SUBMITTED,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Packaging POST error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
