import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { addBusinessDays } from "@/lib/business-days";
import { DispatchExtensionStatus } from "@/lib/dispatch-deadline";
import { notifyDispatchExtensionDecision } from "@/lib/dispatch-notifications";
import { clearSentEmail } from "@/lib/fulfilment-emails";
import { EmailTriggerType } from "@/lib/email-triggers";
import { recordTransactionEvent, TransactionEventType } from "@/lib/transaction-events";
import { trackServerEvent } from "@/lib/starter-pack";

export const dynamic = "force-dynamic";

/**
 * POST /api/transactions/[id]/dispatch-extension/respond
 * Buyer approves or declines a pending dispatch extension.
 * Body: { action: "approve" | "decline" }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const action = body.action === "approve" || body.action === "decline" ? body.action : null;
  if (!action) {
    return NextResponse.json({ error: "Choose allow or decline" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: tx } = await admin
    .from("transactions")
    .select(
      "id, buyer_id, seller_id, listing_id, status, shipped_at, dispatch_deadline_at, dispatch_extension_status, dispatch_extension_business_days"
    )
    .eq("id", id)
    .maybeSingle();

  if (!tx) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  if (tx.buyer_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (tx.dispatch_extension_status !== DispatchExtensionStatus.REQUESTED) {
    return NextResponse.json({ error: "There is no pending extension request" }, { status: 400 });
  }
  if (tx.status !== "pending" || tx.shipped_at) {
    return NextResponse.json({ error: "This order has already been dispatched" }, { status: 400 });
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const extraDays = tx.dispatch_extension_business_days ?? 3;
  const approved = action === "approve";
  const currentDeadline = tx.dispatch_deadline_at ? new Date(tx.dispatch_deadline_at) : now;
  const newDeadline = approved ? addBusinessDays(currentDeadline, extraDays) : currentDeadline;
  const newDeadlineIso = newDeadline.toISOString();

  const updates: Record<string, unknown> = {
    dispatch_extension_status: approved ? DispatchExtensionStatus.APPROVED : DispatchExtensionStatus.DECLINED,
    dispatch_extension_responded_at: nowIso,
    dispatch_extension_responded_by: user.id,
    updated_at: nowIso,
  };
  if (approved) {
    updates.dispatch_deadline_at = newDeadlineIso;
    updates.dispatch_reminder_one_day_sent_at = null;
    updates.dispatch_reminder_final_sent_at = null;
  }

  const { data: updated, error } = await admin
    .from("transactions")
    .update(updates)
    .eq("id", id)
    .eq("buyer_id", user.id)
    .eq("dispatch_extension_status", DispatchExtensionStatus.REQUESTED)
    .eq("status", "pending")
    .is("shipped_at", null)
    .select("id, dispatch_deadline_at, dispatch_extension_status")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated) {
    return NextResponse.json({ error: "This request is no longer pending" }, { status: 400 });
  }

  if (approved) {
    await clearSentEmail(admin, EmailTriggerType.DISPATCH_ONE_DAY_LEFT, `${id}:dispatch_reminder_one_day`);
    await clearSentEmail(admin, EmailTriggerType.DISPATCH_REQUIRED_TODAY, `${id}:dispatch_reminder_final`);
    await recordTransactionEvent(admin, {
      transactionId: id,
      eventType: TransactionEventType.EXTENSION_APPROVED,
      actorId: user.id,
      payload: {
        previous_deadline_at: tx.dispatch_deadline_at,
        dispatch_deadline_at: newDeadlineIso,
        extra_business_days: extraDays,
      },
    });
    await recordTransactionEvent(admin, {
      transactionId: id,
      eventType: TransactionEventType.DEADLINE_CHANGED,
      actorId: user.id,
      payload: {
        reason: "extension_approved",
        previous_deadline_at: tx.dispatch_deadline_at,
        dispatch_deadline_at: newDeadlineIso,
      },
    });
    await trackServerEvent(admin, "dispatch_extension_approved", {
      userId: user.id,
      properties: { transaction_id: id, dispatch_deadline_at: newDeadlineIso },
    });
  } else {
    await recordTransactionEvent(admin, {
      transactionId: id,
      eventType: TransactionEventType.EXTENSION_DECLINED,
      actorId: user.id,
      payload: { dispatch_deadline_at: tx.dispatch_deadline_at },
    });
    await trackServerEvent(admin, "dispatch_extension_declined", {
      userId: user.id,
      properties: { transaction_id: id },
    });
  }

  await notifyDispatchExtensionDecision(admin, {
    transactionId: id,
    listingId: tx.listing_id,
    sellerId: tx.seller_id,
    buyerId: tx.buyer_id,
    approved,
    deadlineIso: newDeadlineIso,
  });

  return NextResponse.json({
    ok: true,
    action,
    dispatch_deadline_at: updated.dispatch_deadline_at,
    dispatch_extension_status: updated.dispatch_extension_status,
  });
}
