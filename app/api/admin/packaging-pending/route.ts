import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { PackagingStatus } from "@/lib/fulfilment";

export const dynamic = "force-dynamic";

const BUCKET = "packaging-photos";
const EXPIRY_SEC = 3600;

/**
 * GET /api/admin/packaging-pending
 * Returns transactions with packaging_status = SUBMITTED and signed photo URLs. Admin only (users.role = 'admin').
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
        "id, listing_id, created_at, packaging_photos, listing:listings(model, category, brand)"
      )
      .eq("packaging_status", PackagingStatus.SUBMITTED)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const bucket = admin.storage.from(BUCKET);
    const withUrls = await Promise.all(
      (rows ?? []).map(async (tx: { id: string; listing_id: string; packaging_photos?: string[]; listing?: unknown; created_at: string }) => {
        const rawPaths = Array.isArray(tx.packaging_photos) ? tx.packaging_photos : [];
        const paths = rawPaths.map((p) => (typeof p === "string" && p.startsWith("/") ? p.slice(1) : p));
        const photoUrls: string[] = [];
        for (const path of paths) {
          if (!path || typeof path !== "string") continue;
          const { data: signData } = await bucket.createSignedUrl(path, EXPIRY_SEC);
          if (signData?.signedUrl) photoUrls.push(signData.signedUrl);
        }
        return {
          id: tx.id,
          listing_id: tx.listing_id,
          created_at: tx.created_at,
          listing: tx.listing,
          photoUrls,
          photoCount: paths.length,
        };
      })
    );

    return NextResponse.json({ transactions: withUrls });
  } catch (e) {
    console.error("Admin packaging-pending error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
