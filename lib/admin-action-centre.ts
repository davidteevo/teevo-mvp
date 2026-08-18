/**
 * Action Centre domain: derive the next admin action from existing listing / order / review state.
 * Do not persist a parallel task table — queues are computed from source rows.
 */

import { NextResponse } from "next/server";

export const ALREADY_PROCESSED_CODE = "ALREADY_PROCESSED";

export function alreadyProcessedResponse() {
  return NextResponse.json(
    { error: "This item has already been processed.", code: ALREADY_PROCESSED_CODE },
    { status: 409 }
  );
}

export const AdminActionType = {
  VERIFY_LISTING: "VERIFY_LISTING",
  DISPATCH_STARTER_PACK: "DISPATCH_STARTER_PACK",
  REVIEW_PACKAGING: "REVIEW_PACKAGING",
  CREATE_LABEL: "CREATE_LABEL",
  REVIEW_FEEDBACK: "REVIEW_FEEDBACK",
} as const;
export type AdminActionTypeValue = (typeof AdminActionType)[keyof typeof AdminActionType];

export const AdminActionFilter = {
  ALL: "all",
  LISTINGS: "listings",
  PACKAGING: "packaging",
  STARTER_PACKS: "starterPacks",
  LABELS: "labels",
  FEEDBACK: "feedback",
} as const;
export type AdminActionFilterValue = (typeof AdminActionFilter)[keyof typeof AdminActionFilter];

export type AdminActionEntityType = "listing" | "transaction" | "review";
export type AdminActionUrgency = "normal" | "approaching" | "overdue";

export const ACTION_CENTRE_FILTERS: { id: AdminActionFilterValue; label: string }[] = [
  { id: "all", label: "All" },
  { id: "listings", label: "Listings" },
  { id: "packaging", label: "Packaging" },
  { id: "starterPacks", label: "Starter Packs" },
  { id: "labels", label: "Labels" },
  { id: "feedback", label: "Feedback" },
];

const FILTER_TO_TYPE: Record<Exclude<AdminActionFilterValue, "all">, AdminActionTypeValue> = {
  listings: AdminActionType.VERIFY_LISTING,
  packaging: AdminActionType.REVIEW_PACKAGING,
  starterPacks: AdminActionType.DISPATCH_STARTER_PACK,
  labels: AdminActionType.CREATE_LABEL,
  feedback: AdminActionType.REVIEW_FEEDBACK,
};

export const ADMIN_ACTION_LABELS: Record<AdminActionTypeValue, string> = {
  VERIFY_LISTING: "Verify listing",
  DISPATCH_STARTER_PACK: "Dispatch Starter Pack",
  REVIEW_PACKAGING: "Review packaging",
  CREATE_LABEL: "Create shipping label",
  REVIEW_FEEDBACK: "Review feedback",
};

export const ADMIN_ACTION_PRIMARY_LABELS: Record<AdminActionTypeValue, string> = {
  VERIFY_LISTING: "Review",
  DISPATCH_STARTER_PACK: "Process",
  REVIEW_PACKAGING: "Review",
  CREATE_LABEL: "Create label",
  REVIEW_FEEDBACK: "Review",
};

const BLOCKING_ACTIONS = new Set<AdminActionTypeValue>([
  AdminActionType.DISPATCH_STARTER_PACK,
  AdminActionType.REVIEW_PACKAGING,
  AdminActionType.CREATE_LABEL,
]);

const HOUR_MS = 60 * 60 * 1000;

/** Central urgency thresholds. Approaching / overdue are not duplicated in UI components. */
export const ACTION_URGENCY_THRESHOLDS: Record<
  AdminActionTypeValue,
  { approachingMs: number; overdueMs: number }
> = {
  VERIFY_LISTING: { approachingMs: 12 * HOUR_MS, overdueMs: 24 * HOUR_MS },
  DISPATCH_STARTER_PACK: { approachingMs: 8 * HOUR_MS, overdueMs: 24 * HOUR_MS },
  REVIEW_PACKAGING: { approachingMs: 8 * HOUR_MS, overdueMs: 24 * HOUR_MS },
  CREATE_LABEL: { approachingMs: 8 * HOUR_MS, overdueMs: 24 * HOUR_MS },
  REVIEW_FEEDBACK: { approachingMs: 24 * HOUR_MS, overdueMs: 48 * HOUR_MS },
};

export type AdminActionItem = {
  id: string;
  actionType: AdminActionTypeValue;
  priorityBand: 1 | 2 | 3 | 4;
  isOverdue: boolean;
  urgency: AdminActionUrgency;
  urgencyLabel: string;
  entityType: AdminActionEntityType;
  entityId: string;
  listingId?: string;
  orderId?: string;
  title: string;
  userLabel: string;
  actionRequiredSince: string;
  waitingLabel: string;
  primaryActionLabel: string;
  specialistHref: string;
  badge?: string;
};

export type AdminActionCounts = {
  all: number;
  listings: number;
  packaging: number;
  starterPacks: number;
  labels: number;
  feedback: number;
};

export type AdminActionCentrePayload = {
  items: AdminActionItem[];
  counts: AdminActionCounts;
  overdueCount: number;
};

export function makeAdminActionId(actionType: AdminActionTypeValue, entityId: string): string {
  return `${actionType}:${entityId}`;
}

export function formatAdminUserLabel(user: {
  first_name?: string | null;
  surname?: string | null;
  email?: string | null;
} | null | undefined): string {
  const first = user?.first_name?.trim();
  const surname = user?.surname?.trim();
  if (first && surname) return `${first} ${surname.charAt(0).toUpperCase()}.`;
  if (first) return first;
  return user?.email?.trim() || "Unknown";
}

export function formatWaitingDuration(fromIso: string, nowMs = Date.now()): string {
  const from = new Date(fromIso).getTime();
  if (!Number.isFinite(from)) return "—";
  const diff = Math.max(0, nowMs - from);
  const minutes = Math.floor(diff / (60 * 1000));
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

export function getActionUrgency(
  actionType: AdminActionTypeValue,
  actionRequiredSince: string,
  nowMs = Date.now()
): { urgency: AdminActionUrgency; isOverdue: boolean; urgencyLabel: string } {
  const from = new Date(actionRequiredSince).getTime();
  const elapsed = Number.isFinite(from) ? Math.max(0, nowMs - from) : 0;
  const { approachingMs, overdueMs } = ACTION_URGENCY_THRESHOLDS[actionType];
  if (elapsed >= overdueMs) {
    return { urgency: "overdue", isOverdue: true, urgencyLabel: "Overdue" };
  }
  if (elapsed >= approachingMs) {
    return { urgency: "approaching", isOverdue: false, urgencyLabel: "Due soon" };
  }
  return { urgency: "normal", isOverdue: false, urgencyLabel: "Normal" };
}

export function getPriorityBand(
  actionType: AdminActionTypeValue,
  isOverdue: boolean
): 1 | 2 | 3 | 4 {
  if (isOverdue) return 1;
  if (BLOCKING_ACTIONS.has(actionType)) return 2;
  if (actionType === AdminActionType.VERIFY_LISTING) return 3;
  return 4;
}

export function specialistHrefForAction(
  actionType: AdminActionTypeValue,
  entityId: string
): string {
  switch (actionType) {
    case AdminActionType.VERIFY_LISTING:
      return `/admin/listings/${entityId}`;
    case AdminActionType.REVIEW_PACKAGING:
      return `/admin/packaging?id=${encodeURIComponent(entityId)}`;
    case AdminActionType.DISPATCH_STARTER_PACK:
      return `/admin/starter-packs?id=${encodeURIComponent(entityId)}`;
    case AdminActionType.CREATE_LABEL:
      return `/admin/fulfilment?id=${encodeURIComponent(entityId)}`;
    case AdminActionType.REVIEW_FEEDBACK:
      return `/admin/feedback/${entityId}`;
  }
}

export function entityTypeForAction(actionType: AdminActionTypeValue): AdminActionEntityType {
  if (actionType === AdminActionType.VERIFY_LISTING) return "listing";
  if (actionType === AdminActionType.REVIEW_FEEDBACK) return "review";
  return "transaction";
}

export type BuildAdminActionInput = {
  actionType: AdminActionTypeValue;
  entityId: string;
  title: string;
  userLabel: string;
  actionRequiredSince: string;
  listingId?: string;
  orderId?: string;
  badge?: string;
};

export function buildAdminActionItem(input: BuildAdminActionInput, nowMs = Date.now()): AdminActionItem {
  const { urgency, isOverdue, urgencyLabel } = getActionUrgency(
    input.actionType,
    input.actionRequiredSince,
    nowMs
  );
  const waiting = formatWaitingDuration(input.actionRequiredSince, nowMs);
  return {
    id: makeAdminActionId(input.actionType, input.entityId),
    actionType: input.actionType,
    priorityBand: getPriorityBand(input.actionType, isOverdue),
    isOverdue,
    urgency,
    urgencyLabel,
    entityType: entityTypeForAction(input.actionType),
    entityId: input.entityId,
    listingId: input.listingId,
    orderId: input.orderId,
    title: input.title,
    userLabel: input.userLabel,
    actionRequiredSince: input.actionRequiredSince,
    waitingLabel: isOverdue ? `${waiting} — Overdue` : waiting,
    primaryActionLabel: ADMIN_ACTION_PRIMARY_LABELS[input.actionType],
    specialistHref: specialistHrefForAction(input.actionType, input.entityId),
    badge: input.badge,
  };
}

export function compareAdminActions(a: AdminActionItem, b: AdminActionItem): number {
  if (a.priorityBand !== b.priorityBand) return a.priorityBand - b.priorityBand;
  return new Date(a.actionRequiredSince).getTime() - new Date(b.actionRequiredSince).getTime();
}

export function sortAdminActions(items: AdminActionItem[]): AdminActionItem[] {
  return [...items].sort(compareAdminActions);
}

export function filterAdminActions(
  items: AdminActionItem[],
  filter: AdminActionFilterValue
): AdminActionItem[] {
  if (filter === AdminActionFilter.ALL) return items;
  const type = FILTER_TO_TYPE[filter];
  return items.filter((item) => item.actionType === type);
}

export function countAdminActions(items: AdminActionItem[]): AdminActionCounts {
  const counts: AdminActionCounts = {
    all: items.length,
    listings: 0,
    packaging: 0,
    starterPacks: 0,
    labels: 0,
    feedback: 0,
  };
  for (const item of items) {
    if (item.actionType === AdminActionType.VERIFY_LISTING) counts.listings += 1;
    else if (item.actionType === AdminActionType.REVIEW_PACKAGING) counts.packaging += 1;
    else if (item.actionType === AdminActionType.DISPATCH_STARTER_PACK) counts.starterPacks += 1;
    else if (item.actionType === AdminActionType.CREATE_LABEL) counts.labels += 1;
    else if (item.actionType === AdminActionType.REVIEW_FEEDBACK) counts.feedback += 1;
  }
  return counts;
}

export function emptyFilterMessage(filter: AdminActionFilterValue): string {
  switch (filter) {
    case "listings":
      return "No listing actions currently require attention.";
    case "packaging":
      return "No packaging actions currently require attention.";
    case "starterPacks":
      return "No Starter Pack actions currently require attention.";
    case "labels":
      return "No shipping label actions currently require attention.";
    case "feedback":
      return "No feedback actions currently require attention.";
    default:
      return "There are currently no admin actions requiring attention.";
  }
}

export function isAlreadyProcessedPayload(data: unknown): boolean {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { code?: string }).code === ALREADY_PROCESSED_CODE
  );
}

export function isPackagingAwaitingReview(
  packagingStatus: string | null | undefined,
  photoCount: number
): boolean {
  if (photoCount < 3) return false;
  return packagingStatus === "SUBMITTED" || packagingStatus == null;
}

export function packagingActionRequiredSince(row: {
  fulfilment_status?: string | null;
  fulfilment_status_changed_at?: string | null;
  updated_at?: string | null;
  created_at: string;
}): string {
  if (row.fulfilment_status === "PACKAGING_SUBMITTED" && row.fulfilment_status_changed_at) {
    return row.fulfilment_status_changed_at;
  }
  return row.updated_at || row.created_at;
}

export function labelActionRequiredSince(row: {
  reviewed_at?: string | null;
  fulfilment_status_changed_at?: string | null;
  created_at: string;
}): string {
  return row.reviewed_at || row.fulfilment_status_changed_at || row.created_at;
}

export type NextAdminActionInput = {
  listingStatus?: string | null;
  packagingSource?: string | null;
  starterPackDispatchedAt?: string | null;
  packagingStatus?: string | null;
  packagingPhotoCount?: number;
  fulfilmentStatus?: string | null;
  fulfilmentMode?: string | null;
  shippingLabelUrl?: string | null;
  requiresAdminAction?: boolean;
};

/**
 * Resolve the next admin action from existing workflow state.
 * A listing, transaction, and review are separate entities — callers pass the relevant fields.
 */
export function resolveNextAdminAction(input: NextAdminActionInput): AdminActionTypeValue | "NONE" {
  if (input.listingStatus === "pending") return AdminActionType.VERIFY_LISTING;
  if (input.requiresAdminAction === true) return AdminActionType.REVIEW_FEEDBACK;
  if (input.packagingSource === "TEEVO_STARTER_PACK" && !input.starterPackDispatchedAt) {
    return AdminActionType.DISPATCH_STARTER_PACK;
  }
  if (isPackagingAwaitingReview(input.packagingStatus, input.packagingPhotoCount ?? 0)) {
    return AdminActionType.REVIEW_PACKAGING;
  }
  if (
    input.fulfilmentMode === "manual" &&
    input.fulfilmentStatus === "PACKAGING_VERIFIED" &&
    !input.shippingLabelUrl
  ) {
    return AdminActionType.CREATE_LABEL;
  }
  return "NONE";
}
