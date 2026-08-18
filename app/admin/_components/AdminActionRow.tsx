"use client";

import { AlertCircle, Clock } from "lucide-react";
import {
  ADMIN_ACTION_LABELS,
  type AdminActionItem,
} from "@/lib/admin-action-centre";

function PriorityMark({ item }: { item: AdminActionItem }) {
  if (item.urgency === "overdue") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-divot-pink">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Overdue
      </span>
    );
  }
  if (item.urgency === "approaching") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-mowing-green">
        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Due soon
      </span>
    );
  }
  return <span className="text-xs text-mowing-green/60">Normal</span>;
}

export function AdminActionRow({
  item,
  onOpen,
  variant,
}: {
  item: AdminActionItem;
  onOpen: (item: AdminActionItem) => void;
  variant: "row" | "card";
}) {
  if (variant === "card") {
    return (
      <article className="rounded-xl border border-par-3-punch/20 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-mowing-green/70">
            {ADMIN_ACTION_LABELS[item.actionType]}
          </p>
          <PriorityMark item={item} />
        </div>
        <h3 className="mt-1 font-semibold text-mowing-green">{item.title}</h3>
        <p className="text-sm text-mowing-green/80">{item.userLabel}</p>
        {item.badge && (
          <p className="mt-1 text-xs text-mowing-green/60">{item.badge}</p>
        )}
        <p className="mt-2 text-sm text-mowing-green/70">
          Waiting:{" "}
          <span className={item.isOverdue ? "font-medium text-divot-pink" : "font-medium text-mowing-green"}>
            {item.waitingLabel}
          </span>
        </p>
        <button
          type="button"
          onClick={() => onOpen(item)}
          className="mt-3 rounded-lg bg-mowing-green px-3 py-2 text-sm font-medium text-off-white-pique hover:opacity-90"
        >
          {item.primaryActionLabel}
        </button>
      </article>
    );
  }

  return (
    <tr className="border-t border-par-3-punch/10 text-sm text-mowing-green">
      <td className="px-3 py-3 whitespace-nowrap">
        <PriorityMark item={item} />
      </td>
      <td className="px-3 py-3">
        <div className="font-medium">{ADMIN_ACTION_LABELS[item.actionType]}</div>
        {item.badge && <div className="text-xs text-mowing-green/60">{item.badge}</div>}
      </td>
      <td className="px-3 py-3">
        <div className="font-medium">{item.title}</div>
        {item.orderId && (
          <div className="font-mono text-xs text-mowing-green/50">#{item.orderId.slice(0, 8)}</div>
        )}
      </td>
      <td className="px-3 py-3 whitespace-nowrap">{item.userLabel}</td>
      <td className={`px-3 py-3 whitespace-nowrap ${item.isOverdue ? "text-divot-pink font-medium" : ""}`}>
        {item.waitingLabel}
      </td>
      <td className="px-3 py-3">
        <button
          type="button"
          onClick={() => onOpen(item)}
          className="rounded-lg bg-mowing-green px-3 py-1.5 text-sm font-medium text-off-white-pique hover:opacity-90"
        >
          {item.primaryActionLabel}
        </button>
      </td>
    </tr>
  );
}
