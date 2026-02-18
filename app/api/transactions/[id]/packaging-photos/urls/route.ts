import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const BUCKET = "packaging-photos";
const EXPIRY_SEC = 3600;

/**
 * GET /api/transactions/[id]/packaging-photos/urls
 * Returns signed read URLs for packaging_photos. Seller (own tx) or admin only.
 */
export async function GET(
  _request: Request,
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
      .select("id, seller_id, packaging_photos")
      .eq("id", transactionId)
      .single();

    if (txErr || !tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const adminEmails = (process.env.TEEVO_ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const isAdmin = user.email && adminEmails.includes(user.email.toLowerCase());
    if (tx.seller_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const paths = Array.isArray(tx.packaging_photos) ? (tx.packaging_photos as string[]) : [];
    if (paths.length === 0) {
      return NextResponse.json({ urls: [] });
    }

    const bucket = admin.storage.from(BUCKET);
    const urls: string[] = [];
    for (const path of paths) {
      const { data: signData, error: signErr } = await bucket.createSignedUrl(path, EXPIRY_SEC);
      if (!signErr && signData?.signedUrl) {
        urls.push(signData.signedUrl);
      }
    }

    return NextResponse.json({ urls });
  } catch (e) {
    console.error("Packaging photo URLs error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
