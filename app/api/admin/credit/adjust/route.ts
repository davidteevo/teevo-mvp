import { NextResponse } from "next/server";
import { insertCreditTransaction } from "@/lib/referral/credit";
import { logAdminAction, requireAdmin } from "@/lib/referral/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    let body: { userId?: string; amountPence?: number; notes?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    if (!body.userId || typeof body.amountPence !== "number" || !Number.isInteger(body.amountPence)) {
      return NextResponse.json({ error: "userId and integer amountPence are required" }, { status: 400 });
    }
    const row = await insertCreditTransaction(auth.admin, {
      userId: body.userId,
      amountPence: body.amountPence,
      type: "admin_adjustment",
      status: body.amountPence >= 0 ? "available" : "redeemed",
      adminNotes: body.notes ?? null,
      approvedAt: new Date().toISOString(),
    });
    if (!row) return NextResponse.json({ error: "Could not record adjustment" }, { status: 500 });
    await logAdminAction(auth.admin, {
      adminId: auth.user.id,
      action: "credit_admin_adjustment",
      targetType: "user",
      targetId: body.userId,
      payload: { amount_pence: body.amountPence, notes: body.notes ?? null },
    });
    return NextResponse.json({ id: row.id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
