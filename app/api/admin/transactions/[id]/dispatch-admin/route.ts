import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { addBusinessDays } from "@/lib/business-days";
import {
  AvailabilityConfirmationStatus,
  CancellationReason,
} from "@/lib/dispatch-deadline";
import { resolveListingAvailabilityNotification } from "@/lib/dispatch-notifications";
import { cancelUndispatchedOrder } from "@/lib/dispatch-timeout";
import { notifyWatchersNowAvailable, notifyWatchersUnavailable } from "@/lib/watchlist-emails";
import { recordTransactionEvent, TransactionEventType } from "@/lib/transaction-events";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { admin, user };
}

/**
 * POST /api/admin/transactions/[id]/dispatch-admin
 * Body: { action: "retry_refund" | "extend" | "cancel" | "override_availability", businessDays?, available? }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;
  const { admin, user } = auth as { admin: ReturnType<typeof createAdminClient>; user: { id: string } };

  const body = await request.json().catch(() => ({}));
  const action = body.action as string;

  if (action === "retry_refund" || action === "cancel") {
    const result = await cancelUndispatchedOrder(admin, {
      transactionId: id,
      reason: action === "cancel" ? CancellationReason.ADMIN_OVERRIDE : CancellationReason.SELLER_DISPATCH_TIMEOUT,
      actorId: user.id,
      skipDeadlineCheck: true,
    });
    await admin.from("admin_actions").insert({
      admin_id: user.id,
      action: action === "cancel" ? "dispatch_cancel" : "dispatch_retry_refund",
      target_type: "transaction",
      target_id: id,
      payload: result,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.retryable ? 409 : 400 });
    }
    return NextResponse.json(result);
  }

  if (action === "extend") {
    const days = Number(body.businessDays);
    if (!Number.isFinite(days) || days < 1 || days > 30) {
      return NextResponse.json({ error: "businessDays must be between 1 and 30" }, { status: 400 });
    }
    const { data: tx } = await admin
      .from("transactions")
      .select("id, status, shipped_at, dispatch_deadline_at, cancellation_status")
      .eq("id", id)
      .maybeSingle();
    if (!tx) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (tx.status !== "pending" || tx.shipped_at || tx.cancellation_status === "completed") {
      return NextResponse.json({ error: "Cannot extend this order" }, { status: 400 });
    }
    const base = tx.dispatch_deadline_at ? new Date(tx.dispatch_deadline_at) : new Date();
    const next = addBusinessDays(base, Math.trunc(days));
    const now = new Date().toISOString();
    await admin
      .from("transactions")
      .update({
        dispatch_deadline_at: next.toISOString(),
        dispatch_reminder_one_day_sent_at: null,
        dispatch_reminder_final_sent_at: null,
        updated_at: now,
      })
      .eq("id", id);
    await recordTransactionEvent(admin, {
      transactionId: id,
      eventType: TransactionEventType.ADMIN_OVERRIDE,
      actorId: user.id,
      payload: {
        action: "extend_deadline",
        previous_deadline_at: tx.dispatch_deadline_at,
        dispatch_deadline_at: next.toISOString(),
        business_days: Math.trunc(days),
      },
    });
    await admin.from("admin_actions").insert({
      admin_id: user.id,
      action: "dispatch_extend",
      target_type: "transaction",
      target_id: id,
      payload: { business_days: Math.trunc(days), dispatch_deadline_at: next.toISOString() },
    });
    return NextResponse.json({ ok: true, dispatch_deadline_at: next.toISOString() });
  }

  if (action === "override_availability") {
    if (typeof body.available !== "boolean") {
      return NextResponse.json({ error: "available is required" }, { status: 400 });
    }
    const { data: tx } = await admin.from("transactions").select("id, listing_id").eq("id", id).maybeSingle();
    if (!tx) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const now = new Date().toISOString();
    if (body.available) {
      await admin
        .from("listings")
        .update({
          status: "verified",
          archived_at: null,
          availability_confirmation_status: AvailabilityConfirmationStatus.CONFIRMED_AVAILABLE,
          availability_confirmed_at: now,
          updated_at: now,
        })
        .eq("id", tx.listing_id);
      await recordTransactionEvent(admin, {
        transactionId: id,
        eventType: TransactionEventType.LISTING_REACTIVATED,
        actorId: user.id,
        payload: { listing_id: tx.listing_id, admin: true },
      });
      await notifyWatchersNowAvailable(admin, tx.listing_id).catch((e) =>
        console.error("notifyWatchersNowAvailable failed", e)
      );
    } else {
      await admin
        .from("listings")
        .update({
          archived_at: now,
          availability_confirmation_status: AvailabilityConfirmationStatus.CONFIRMED_UNAVAILABLE,
          updated_at: now,
        })
        .eq("id", tx.listing_id);
      await recordTransactionEvent(admin, {
        transactionId: id,
        eventType: TransactionEventType.LISTING_MARKED_UNAVAILABLE,
        actorId: user.id,
        payload: { listing_id: tx.listing_id, admin: true },
      });
      await notifyWatchersUnavailable(admin, tx.listing_id, "archived").catch((e) =>
        console.error("notifyWatchersUnavailable failed", e)
      );
    }
    await resolveListingAvailabilityNotification(admin, id);
    await admin.from("admin_actions").insert({
      admin_id: user.id,
      action: "listing_availability_override",
      target_type: "transaction",
      target_id: id,
      payload: { available: body.available, listing_id: tx.listing_id },
    });
    return NextResponse.json({ ok: true, available: body.available });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
