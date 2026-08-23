import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { formatDispatchDeadline } from "@/lib/business-days";
import { getAdminTransactionDetail, getTransactionEvents } from "@/lib/admin-data";
import { AdminDispatchActions } from "./AdminDispatchActions";
import { OrderWorkflowTimeline } from "@/app/admin/_components/OrderWorkflowTimeline";
import { buildOrderWorkflowTimeline, type OrderTimelineInput } from "@/lib/admin-order-timeline";

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/London",
    });
  } catch {
    return iso;
  }
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-2 border-b border-par-3-punch/10">
      <dt className="text-sm text-mowing-green/70">{label}</dt>
      <dd className="sm:col-span-2 text-sm text-mowing-green break-all">{value ?? "—"}</dd>
    </div>
  );
}

export default async function AdminTransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [tx, events] = await Promise.all([getAdminTransactionDetail(id), getTransactionEvents(id)]);
  if (!tx) notFound();

  const listing = tx.listing as
    | { id?: string; model?: string | null; title?: string | null; status?: string; availability_confirmation_status?: string | null }
    | null;
  const buyer = tx.buyer as { email?: string | null } | null;
  const seller = tx.seller as { email?: string | null } | null;
  const deadline = tx.dispatch_deadline_at as string | null;
  const timeline = buildOrderWorkflowTimeline(tx as OrderTimelineInput);

  return (
    <div>
      <p className="text-sm">
        <Link href="/admin/transactions" className="text-par-3-punch hover:underline">
          ← Transactions
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-bold text-mowing-green">
        {listing?.title || listing?.model || "Order"} #{id.slice(0, 8)}
      </h1>
      <p className="mt-1 text-sm text-mowing-green/70">{formatPrice(Number(tx.amount ?? 0))} · {String(tx.status)}</p>

      <div className="mt-6">
        <OrderWorkflowTimeline
          stages={timeline.stages}
          currentStageLabel={timeline.currentStageLabel}
          nextActionLabel={timeline.nextActionLabel}
        />
      </div>

      <dl className="mt-6 rounded-xl border border-par-3-punch/20 bg-white px-4">
        <Row label="Purchased" value={fmt(tx.created_at as string)} />
        <Row label="Original deadline" value={tx.original_dispatch_deadline_at ? formatDispatchDeadline(tx.original_dispatch_deadline_at as string) : "—"} />
        <Row label="Current deadline" value={deadline ? formatDispatchDeadline(deadline) : "—"} />
        <Row label="Clock paused" value={tx.dispatch_clock_paused_at ? `${fmt(tx.dispatch_clock_paused_at as string)} (${tx.dispatch_clock_pause_reason ?? ""})` : "No"} />
        <Row label="Dispatch status" value={tx.shipped_at ? `Shipped ${fmt(tx.shipped_at as string)}` : String(tx.fulfilment_status ?? tx.status)} />
        <Row label="Extension" value={String(tx.dispatch_extension_status ?? "—")} />
        <Row label="Extension requested" value={fmt(tx.dispatch_extension_requested_at as string | null)} />
        <Row label="Extension response" value={fmt(tx.dispatch_extension_responded_at as string | null)} />
        <Row label="Reminders" value={`2-day: ${fmt(tx.dispatch_reminder_after_purchase_sent_at as string | null)} · 1-day: ${fmt(tx.dispatch_reminder_one_day_sent_at as string | null)} · Final: ${fmt(tx.dispatch_reminder_final_sent_at as string | null)}`} />
        <Row label="Cancellation" value={tx.cancellation_status ? `${tx.cancellation_status} (${tx.cancellation_reason ?? ""}) ${fmt(tx.cancelled_at as string | null)}` : "—"} />
        <Row label="Payment" value={String(tx.stripe_payment_id ?? "—")} />
        <Row label="Refund" value={String(tx.stripe_refund_id ?? "—")} />
        <Row
          label="Buyer"
          value={
            <Link href={`/admin/users/${tx.buyer_id}`} className="text-par-3-punch hover:underline">
              {buyer?.email ?? String(tx.buyer_id)}
            </Link>
          }
        />
        <Row
          label="Seller"
          value={
            <Link href={`/admin/users/${tx.seller_id}`} className="text-par-3-punch hover:underline">
              {seller?.email ?? String(tx.seller_id)}
            </Link>
          }
        />
        <Row
          label="Listing"
          value={
            listing?.id ? (
              <Link href={`/admin/listings/${listing.id}`} className="text-par-3-punch hover:underline">
                {listing.status} · {listing.availability_confirmation_status ?? "no confirmation needed"}
              </Link>
            ) : (
              "—"
            )
          }
        />
      </dl>

      <AdminDispatchActions
        transactionId={id}
        canCancel={tx.status === "pending" && !tx.shipped_at && tx.cancellation_status !== "completed"}
        canRetry={tx.cancellation_status === "failed"}
        listingAvailability={listing?.availability_confirmation_status ?? null}
      />

      <h2 className="mt-8 text-lg font-semibold text-mowing-green">Audit trail</h2>
      <ul className="mt-3 rounded-xl border border-par-3-punch/20 bg-white divide-y divide-par-3-punch/10">
        {events.length === 0 ? (
          <li className="p-4 text-sm text-mowing-green/70">No events recorded yet.</li>
        ) : (
          events.map((ev) => (
            <li key={ev.id} className="p-3">
              <p className="text-sm font-medium text-mowing-green">{ev.event_type}</p>
              <p className="text-xs text-mowing-green/60">{fmt(ev.created_at)}</p>
              {ev.payload && Object.keys(ev.payload).length > 0 && (
                <pre className="mt-1 text-xs text-mowing-green/70 whitespace-pre-wrap">
                  {JSON.stringify(ev.payload, null, 2)}
                </pre>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
