import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { PackagingStatus } from "@/lib/fulfilment";

/**
 * POST /api/transactions/[id]/packaging-photos/reject
 * Admin only (users.role = 'admin'). Sets packaging_status = REJECTED, review_notes, reviewed_by, reviewed_at.
 * Sellers cannot reject; they can only submit/re-submit.
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
      return NextResponse.json({ error: "Forbidden. Only admins can reject packaging." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";

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
        { error: "Not submitted for review" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    await admin
      .from("transactions")
      .update({
        packaging_status: PackagingStatus.REJECTED,
        review_notes: notes || null,
        packaging_review_notes: notes || null,
        reviewed_by: user.id,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("id", transactionId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Packaging reject error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
