import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { PackagingSource, formatSellerAddress } from "@/lib/starter-pack";

export const dynamic = "force-dynamic";

type UserRow = {
  id: string;
  email?: string | null;
  display_name?: string | null;
  first_name?: string | null;
  surname?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  address_city?: string | null;
  address_postcode?: string | null;
  address_country?: string | null;
};

function formatPerson(u: UserRow | undefined) {
  const name =
    [u?.first_name, u?.surname].filter(Boolean).join(" ") ||
    u?.display_name ||
    u?.email ||
    "—";
  return { name, email: u?.email ?? null };
}

/**
 * GET /api/admin/starter-packs?status=needs_shipping|dispatched|all
 */
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? "needs_shipping";

    let query = admin
      .from("transactions")
      .select(
        `id, created_at, listing_id, seller_id, box_type, packaging_status, packaging_source,
         packaging_requested_at, starter_pack_dispatched_at, starter_pack_admin_notified_at,
         listing:listings(model, category, brand)`
      )
      .eq("packaging_source", PackagingSource.TEEVO_STARTER_PACK)
      .order("packaging_requested_at", { ascending: true });

    if (status === "needs_shipping") {
      query = query.is("starter_pack_dispatched_at", null);
    } else if (status === "dispatched") {
      query = query.not("starter_pack_dispatched_at", "is", null);
    }

    const { data: rows, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const txs = rows ?? [];
    const sellerIds = Array.from(new Set(txs.map((tx) => tx.seller_id).filter(Boolean)));
    const usersById = new Map<string, UserRow>();
    if (sellerIds.length > 0) {
      const { data: users } = await admin
        .from("users")
        .select(
          "id, email, display_name, first_name, surname, address_line1, address_line2, address_city, address_postcode, address_country"
        )
        .in("id", sellerIds);
      for (const u of users ?? []) {
        usersById.set(u.id, u);
      }
    }

    const requests = txs.map((tx) => {
      const listing = tx.listing as { model?: string; category?: string; brand?: string } | null;
      const seller = usersById.get(tx.seller_id);
      return {
        id: tx.id,
        created_at: tx.created_at,
        packaging_requested_at: tx.packaging_requested_at,
        starter_pack_dispatched_at: tx.starter_pack_dispatched_at,
        starter_pack_admin_notified_at: tx.starter_pack_admin_notified_at,
        box_type: tx.box_type,
        packaging_status: tx.packaging_status,
        item: listing ? `${listing.brand ?? ""} ${listing.model ?? ""}`.trim() : "Item",
        category: listing?.category ?? null,
        seller: formatPerson(seller),
        seller_address: seller ? formatSellerAddress(seller) : "",
      };
    });

    return NextResponse.json({ requests });
  } catch (e) {
    console.error("Admin starter-packs list error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
