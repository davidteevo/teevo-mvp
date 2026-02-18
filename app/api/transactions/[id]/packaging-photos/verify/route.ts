import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { FulfilmentStatus, PackagingStatus } from "@/lib/fulfilment";

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
 * POST /api/transactions/[id]/packaging-photos/verify
 * Admin only. Sets packaging_status = VERIFIED, fulfilment_status = PACKAGING_VERIFIED.
 * Requires current user email in TEEVO_ADMIN_EMAILS (comma-separated).
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
    if (!user || !isAdminEmail(user.email ?? undefined)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data: tx, error: txErr } = await admin
      .from("transactions")
      .select("id, packaging_status")
      .eq("id", transactionId)
      .single();

    if (txErr || !tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    if (tx.packaging_status !== PackagingStatus.SUBMITTED) {
      return NextResponse.json(
        { error: tx.packaging_status === PackagingStatus.VERIFIED ? "Already verified" : "Not submitted for review" },
        { status: 400 }
      );
    }

    await admin
      .from("transactions")
      .update({
        packaging_status: PackagingStatus.VERIFIED,
        fulfilment_status: FulfilmentStatus.PACKAGING_VERIFIED,
        packaging_review_notes: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Packaging verify error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
