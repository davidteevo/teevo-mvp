import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { FulfilmentStatus } from "@/lib/fulfilment";
import { FulfilmentMode } from "@/lib/fulfilment-providers";

export const dynamic = "force-dynamic";

type UserRow = {
  id: string;
  email?: string | null;
  display_name?: string | null;
  first_name?: string | null;
  surname?: string | null;
};

function formatPerson(u: UserRow | undefined, fallbackName: string | null) {
  const name =
    [u?.first_name, u?.surname].filter(Boolean).join(" ") ||
    u?.display_name ||
    fallbackName ||
    u?.email ||
    "—";
  return { name, email: u?.email ?? null };
}

/**
 * GET /api/admin/fulfilment/awaiting-labels
 * Manual orders with packaging verified and no shipping label yet.
 */
export async function GET() {
  try {
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

    const { data: rows, error } = await admin
      .from("transactions")
      .select(
        `id, created_at, shipping_fee_gbp, fulfilment_status, fulfilment_mode,
         buyer_name, buyer_address_line1, buyer_address_line2, buyer_city, buyer_postcode, buyer_country,
         buyer_id, seller_id, listing_id,
         listing:listings(model, category, brand)`
      )
      .eq("fulfilment_mode", FulfilmentMode.MANUAL)
      .eq("fulfilment_status", FulfilmentStatus.PACKAGING_VERIFIED)
      .is("shipping_label_url", null)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const txs = rows ?? [];
    const userIds = Array.from(
      new Set(txs.flatMap((tx) => [tx.buyer_id, tx.seller_id].filter(Boolean) as string[]))
    );
    const usersById = new Map<string, UserRow>();
    if (userIds.length > 0) {
      const { data: users } = await admin
        .from("users")
        .select("id, email, display_name, first_name, surname")
        .in("id", userIds);
      for (const u of users ?? []) {
        usersById.set(u.id, u);
      }
    }

    const transactions = txs.map((tx) => {
      const listing = tx.listing as { model?: string; category?: string; brand?: string } | null;
      const addressParts = [
        tx.buyer_name,
        tx.buyer_address_line1,
        tx.buyer_address_line2,
        tx.buyer_city,
        tx.buyer_postcode,
        tx.buyer_country,
      ].filter((p): p is string => !!p && String(p).trim().length > 0);

      return {
        id: tx.id,
        created_at: tx.created_at,
        shipping_fee_gbp: tx.shipping_fee_gbp,
        fulfilment_status: tx.fulfilment_status,
        item: listing ? `${listing.brand ?? ""} ${listing.model ?? ""}`.trim() : "Item",
        buyer: formatPerson(usersById.get(tx.buyer_id), tx.buyer_name),
        seller: formatPerson(usersById.get(tx.seller_id), null),
        shipping_address: addressParts.join(", "),
      };
    });

    return NextResponse.json({ transactions });
  } catch (e) {
    console.error("Admin awaiting-labels error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
