import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { PackagingStatus } from "@/lib/fulfilment";

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
 * POST /api/transactions/[id]/packaging-photos/reject
 * Admin only. Sets packaging_status = REJECTED, packaging_review_notes = body.notes.
 * Requires current user email in TEEVO_ADMIN_EMAILS.
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

    const body = await request.json().catch(() => ({}));
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";

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
        { error: "Not submitted for review" },
        { status: 400 }
      );
    }

    await admin
      .from("transactions")
      .update({
        packaging_status: PackagingStatus.REJECTED,
        packaging_review_notes: notes || null,
        updated_at: new Date().toISOString(),
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
