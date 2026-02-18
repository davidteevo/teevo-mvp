import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { PackagingStatus } from "@/lib/fulfilment";

const BUCKET = "packaging-photos";
const EXPIRY_SEC = 3600;

function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  const list = process.env.TEEVO_ADMIN_EMAILS;
  if (!list) return false;
  return list
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .includes(email.toLowerCase());
}

/**
 * GET /api/admin/packaging-pending
 * Returns transactions with packaging_status = SUBMITTED and signed photo URLs. Admin only.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !isAdminEmail(user.email ?? undefined)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();
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
        const paths = Array.isArray(tx.packaging_photos) ? tx.packaging_photos : [];
        const photoUrls: string[] = [];
        for (const path of paths) {
          const { data: signData } = await bucket.createSignedUrl(path, EXPIRY_SEC);
          if (signData?.signedUrl) photoUrls.push(signData.signedUrl);
        }
        return {
          id: tx.id,
          listing_id: tx.listing_id,
          created_at: tx.created_at,
          listing: tx.listing,
          photoUrls,
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
