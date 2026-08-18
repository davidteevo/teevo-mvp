/**
 * Order workflow timeline derived from existing transaction fulfilment fields.
 * Stages that do not apply to the selected route are omitted.
 */

import { FulfilmentStatus } from "@/lib/fulfilment";
import { PackagingSource } from "@/lib/starter-pack";
import {
  AdminActionType,
  ADMIN_ACTION_LABELS,
  resolveNextAdminAction,
  type AdminActionTypeValue,
} from "@/lib/admin-action-centre";

export type WorkflowStageState = "done" | "current" | "upcoming";

export type WorkflowStage = {
  id: string;
  label: string;
  state: WorkflowStageState;
};

export type OrderWorkflowTimeline = {
  stages: WorkflowStage[];
  currentStageLabel: string;
  nextActionLabel: string;
};

export type OrderTimelineInput = {
  packaging_source?: string | null;
  packaging_requested_at?: string | null;
  starter_pack_dispatched_at?: string | null;
  packaging_status?: string | null;
  packaging_photos?: unknown;
  shipping_package?: string | null;
  fulfilment_status?: string | null;
  fulfilment_mode?: string | null;
  shipping_label_url?: string | null;
  shippo_label_url?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  buyer_confirmed_at?: string | null;
  completed_at?: string | null;
  status?: string | null;
  order_state?: string | null;
};

const RANK: Record<string, number> = {
  PAID: 0,
  PACKAGING_SUBMITTED: 1,
  PACKAGING_VERIFIED: 2,
  LABEL_CREATED: 3,
  SHIPPED: 4,
  DELIVERED: 5,
  COMPLETED: 6,
  CANCELLED: -1,
};

function fulfilmentRank(status: string | null | undefined): number {
  if (!status) return 0;
  return RANK[status] ?? 0;
}

function photoCount(photos: unknown): number {
  return Array.isArray(photos) ? photos.length : 0;
}

function hasLabel(input: OrderTimelineInput): boolean {
  return Boolean(input.shipping_label_url || input.shippo_label_url) ||
    fulfilmentRank(input.fulfilment_status) >= RANK.LABEL_CREATED ||
    input.order_state === "label_created" ||
    input.order_state === "shipped" ||
    input.order_state === "delivered" ||
    input.order_state === "completed";
}

export function buildOrderWorkflowTimeline(input: OrderTimelineInput): OrderWorkflowTimeline {
  const isStarter = input.packaging_source === PackagingSource.TEEVO_STARTER_PACK;
  const fs = input.fulfilment_status ?? FulfilmentStatus.PAID;
  const cancelled = fs === FulfilmentStatus.CANCELLED || input.order_state === "cancelled";

  type Def = { id: string; label: string; done: boolean };
  const defs: Def[] = [{ id: "purchased", label: "Purchased", done: true }];

  if (isStarter) {
    defs.push({
      id: "starter_requested",
      label: "Starter Pack requested",
      done: Boolean(input.packaging_requested_at) || isStarter,
    });
    defs.push({
      id: "starter_dispatched",
      label: "Starter Pack dispatched",
      done: Boolean(input.starter_pack_dispatched_at),
    });
  } else {
    defs.push({
      id: "packaging_selected",
      label: "Packaging selected",
      done: Boolean(input.packaging_requested_at || input.shipping_package || input.packaging_source),
    });
  }

  defs.push({
    id: "packaging_submitted",
    label: "Packaging photos submitted",
    done:
      input.packaging_status === "SUBMITTED" ||
      input.packaging_status === "VERIFIED" ||
      fulfilmentRank(fs) >= RANK.PACKAGING_SUBMITTED,
  });
  defs.push({
    id: "packaging_verified",
    label: "Packaging verified",
    done: input.packaging_status === "VERIFIED" || fulfilmentRank(fs) >= RANK.PACKAGING_VERIFIED,
  });
  defs.push({
    id: "label",
    label: "Shipping label",
    done: hasLabel(input),
  });
  defs.push({
    id: "shipped",
    label: "Dispatched",
    done: Boolean(input.shipped_at) || fulfilmentRank(fs) >= RANK.SHIPPED || input.order_state === "shipped",
  });
  defs.push({
    id: "delivered",
    label: "Delivered",
    done:
      Boolean(input.delivered_at) ||
      fulfilmentRank(fs) >= RANK.DELIVERED ||
      input.order_state === "delivered",
  });
  defs.push({
    id: "buyer_confirmed",
    label: "Buyer confirmation",
    done: Boolean(input.buyer_confirmed_at),
  });
  defs.push({
    id: "completed",
    label: "Funds released",
    done:
      Boolean(input.completed_at) ||
      fs === FulfilmentStatus.COMPLETED ||
      input.status === "complete" ||
      input.order_state === "completed",
  });

  let currentIndex = defs.findIndex((d) => !d.done);
  if (currentIndex < 0) currentIndex = defs.length - 1;
  if (cancelled) currentIndex = Math.max(0, defs.findIndex((d) => !d.done));

  const currentLabels: Record<string, string> = {
    starter_dispatched: "Starter Pack awaiting dispatch",
    packaging_submitted: "Awaiting packaging photos",
    packaging_verified: "Packaging awaiting verification",
    label: "Awaiting shipping label",
    shipped: "Awaiting dispatch",
    delivered: "In transit",
    buyer_confirmed: "Awaiting buyer confirmation",
    completed: "Awaiting funds release",
  };

  const stages: WorkflowStage[] = defs.map((d, i) => {
    const state: WorkflowStageState = d.done ? "done" : i === currentIndex ? "current" : "upcoming";
    const label = state === "current" ? currentLabels[d.id] ?? d.label : d.label;
    return { id: d.id, label, state };
  });

  const current = stages.find((s) => s.state === "current") ?? stages[stages.length - 1];

  const next = resolveNextAdminAction({
    packagingSource: input.packaging_source,
    starterPackDispatchedAt: input.starter_pack_dispatched_at,
    packagingStatus: input.packaging_status,
    packagingPhotoCount: photoCount(input.packaging_photos),
    fulfilmentStatus: input.fulfilment_status,
    fulfilmentMode: input.fulfilment_mode,
    shippingLabelUrl: input.shipping_label_url,
  });

  let nextActionLabel = "No admin action required.";
  if (next !== "NONE") {
    nextActionLabel = `Admin must ${ADMIN_ACTION_LABELS[next as AdminActionTypeValue].toLowerCase()}.`;
    if (next === AdminActionType.DISPATCH_STARTER_PACK) {
      nextActionLabel = "Admin must dispatch the Starter Pack.";
    } else if (next === AdminActionType.REVIEW_PACKAGING) {
      nextActionLabel = "Admin must review packaging.";
    } else if (next === AdminActionType.CREATE_LABEL) {
      nextActionLabel = "Admin must create a shipping label.";
    }
  } else if (cancelled) {
    nextActionLabel = "This order is cancelled.";
  }

  return {
    stages,
    currentStageLabel: cancelled ? "Cancelled" : current.label,
    nextActionLabel,
  };
}
