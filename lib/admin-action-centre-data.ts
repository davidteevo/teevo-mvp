/**
 * Aggregated Action Centre + business metrics + exceptions queries.
 * Uses the service-role client; callers must already be admin-gated.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getListingDisplayTitle } from "@/lib/listing-display";
import { getListingImageUrl } from "@/lib/listing-images";
import { FulfilmentStatus, PACKAGING_PHOTO_LABELS, BOX_TYPE_LABELS, type BoxType } from "@/lib/fulfilment";
import { FulfilmentMode } from "@/lib/fulfilment-providers";
import { PackagingSource, formatSellerAddress } from "@/lib/starter-pack";
import { SLA } from "@/lib/notification-ops-cron";
import { REVIEW_REPORT_REASON_LABELS } from "@/lib/seller-reviews";
import type { Listing } from "@/types/database";
import {
  AdminActionType,
  buildAdminActionItem,
  countAdminActions,
  formatAdminUserLabel,
  isPackagingAwaitingReview,
  labelActionRequiredSince,
  packagingActionRequiredSince,
  sortAdminActions,
  type AdminActionCentrePayload,
  type AdminActionItem,
  type AdminActionTypeValue,
} from "@/lib/admin-action-centre";
import { buildOrderWorkflowTimeline } from "@/lib/admin-order-timeline";

type AdminClient = SupabaseClient;

type UserNameRow = {
  id: string;
  email?: string | null;
  first_name?: string | null;
  surname?: string | null;
  display_name?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  address_city?: string | null;
  address_postcode?: string | null;
  address_country?: string | null;
  role?: string | null;
  created_at?: string | null;
};

function unwrapOne<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}

function listingTitleFromRel(rel: unknown): string {
  const listing = unwrapOne(
    rel as {
      title?: string | null;
      category?: string;
      brand?: string | null;
      model?: string | null;
      item_type?: string | null;
      size?: string | null;
    } | null
  );
  if (!listing) return "Item";
  return getListingDisplayTitle(listing as Listing);
}

async function loadUsersByIds(admin: AdminClient, ids: string[]): Promise<Map<string, UserNameRow>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const map = new Map<string, UserNameRow>();
  if (unique.length === 0) return map;
  const { data } = await admin
    .from("users")
    .select(
      "id, email, first_name, surname, display_name, address_line1, address_line2, address_city, address_postcode, address_country, role, created_at"
    )
    .in("id", unique);
  for (const row of data ?? []) {
    map.set(row.id, row);
  }
  return map;
}

function photoCount(photos: unknown): number {
  return Array.isArray(photos) ? photos.length : 0;
}

export async function getAdminActionCentre(
  admin: AdminClient,
  nowMs = Date.now()
): Promise<AdminActionCentrePayload> {
  const items = await loadAdminActionItems(admin, nowMs);
  const sorted = sortAdminActions(items);
  return {
    items: sorted,
    counts: countAdminActions(sorted),
    overdueCount: sorted.filter((i) => i.isOverdue).length,
  };
}

async function loadAdminActionItems(admin: AdminClient, nowMs: number): Promise<AdminActionItem[]> {
  const [listingsRes, packagingRes, starterRes, labelsRes, feedbackRes] = await Promise.all([
    admin
      .from("listings")
      .select("id, user_id, category, brand, model, title, item_type, size, colour, status, created_at, updated_at, admin_feedback, review_count")
      .eq("status", "pending"),
    admin
      .from("transactions")
      .select(
        "id, listing_id, seller_id, created_at, updated_at, packaging_photos, packaging_status, packaging_source, fulfilment_status, fulfilment_status_changed_at, listing:listings(model, category, brand, title, item_type, size)"
      )
      .or("packaging_status.eq.SUBMITTED,packaging_status.is.null"),
    admin
      .from("transactions")
      .select(
        "id, listing_id, seller_id, created_at, packaging_requested_at, packaging_source, starter_pack_dispatched_at, listing:listings(model, category, brand, title, item_type, size)"
      )
      .eq("packaging_source", PackagingSource.TEEVO_STARTER_PACK)
      .is("starter_pack_dispatched_at", null),
    admin
      .from("transactions")
      .select(
        "id, listing_id, seller_id, created_at, reviewed_at, fulfilment_status, fulfilment_status_changed_at, fulfilment_mode, shipping_label_url, listing:listings(model, category, brand, title, item_type, size)"
      )
      .eq("fulfilment_mode", FulfilmentMode.MANUAL)
      .eq("fulfilment_status", FulfilmentStatus.PACKAGING_VERIFIED)
      .is("shipping_label_url", null),
    admin
      .from("seller_reviews")
      .select("id, buyer_id, seller_id, listing_id, transaction_id, listing_title_snapshot, created_at, requires_admin_action")
      .eq("requires_admin_action", true),
  ]);

  if (listingsRes.error) throw new Error(listingsRes.error.message);
  if (packagingRes.error) throw new Error(packagingRes.error.message);
  if (starterRes.error) throw new Error(starterRes.error.message);
  if (labelsRes.error) throw new Error(labelsRes.error.message);
  if (feedbackRes.error) throw new Error(feedbackRes.error.message);

  const packagingRows = (packagingRes.data ?? []).filter((tx) =>
    isPackagingAwaitingReview(tx.packaging_status, photoCount(tx.packaging_photos))
  );
  const feedbackRows = feedbackRes.data ?? [];

  const reportSince = new Map<string, string>();
  if (feedbackRows.length > 0) {
    const { data: reports } = await admin
      .from("seller_review_reports")
      .select("review_id, created_at")
      .in(
        "review_id",
        feedbackRows.map((r) => r.id)
      )
      .eq("status", "open");
    for (const report of reports ?? []) {
      const prev = reportSince.get(report.review_id);
      if (!prev || report.created_at < prev) reportSince.set(report.review_id, report.created_at);
    }
  }

  const userIds = [
    ...(listingsRes.data ?? []).map((l) => l.user_id),
    ...packagingRows.map((t) => t.seller_id),
    ...(starterRes.data ?? []).map((t) => t.seller_id),
    ...(labelsRes.data ?? []).map((t) => t.seller_id),
    ...feedbackRows.map((r) => r.buyer_id),
  ];
  const users = await loadUsersByIds(admin, userIds);

  const items: AdminActionItem[] = [];

  for (const listing of listingsRes.data ?? []) {
    items.push(
      buildAdminActionItem(
        {
          actionType: AdminActionType.VERIFY_LISTING,
          entityId: listing.id,
          listingId: listing.id,
          title: getListingDisplayTitle(listing as unknown as Listing),
          userLabel: formatAdminUserLabel(users.get(listing.user_id)),
          actionRequiredSince: listing.updated_at || listing.created_at,
          badge: (() => {
            const count = (listing.review_count as number) ?? 0;
            const hasFeedback = !!listing.admin_feedback?.trim();
            if (hasFeedback && count > 0) return `Changes requested · ${count} revision${count === 1 ? "" : "s"}`;
            if (hasFeedback) return "Changes requested";
            if (count > 0) return `Resubmitted · ${count} revision${count === 1 ? "" : "s"}`;
            return undefined;
          })(),
        },
        nowMs
      )
    );
  }

  for (const tx of packagingRows) {
    items.push(
      buildAdminActionItem(
        {
          actionType: AdminActionType.REVIEW_PACKAGING,
          entityId: tx.id,
          listingId: tx.listing_id,
          orderId: tx.id,
          title: listingTitleFromRel(tx.listing),
          userLabel: formatAdminUserLabel(users.get(tx.seller_id)),
          actionRequiredSince: packagingActionRequiredSince(tx),
        },
        nowMs
      )
    );
  }

  for (const tx of starterRes.data ?? []) {
    items.push(
      buildAdminActionItem(
        {
          actionType: AdminActionType.DISPATCH_STARTER_PACK,
          entityId: tx.id,
          listingId: tx.listing_id,
          orderId: tx.id,
          title: listingTitleFromRel(tx.listing),
          userLabel: formatAdminUserLabel(users.get(tx.seller_id)),
          actionRequiredSince: tx.packaging_requested_at || tx.created_at,
        },
        nowMs
      )
    );
  }

  for (const tx of labelsRes.data ?? []) {
    items.push(
      buildAdminActionItem(
        {
          actionType: AdminActionType.CREATE_LABEL,
          entityId: tx.id,
          listingId: tx.listing_id,
          orderId: tx.id,
          title: listingTitleFromRel(tx.listing),
          userLabel: formatAdminUserLabel(users.get(tx.seller_id)),
          actionRequiredSince: labelActionRequiredSince(tx),
        },
        nowMs
      )
    );
  }

  for (const review of feedbackRows) {
    items.push(
      buildAdminActionItem(
        {
          actionType: AdminActionType.REVIEW_FEEDBACK,
          entityId: review.id,
          listingId: review.listing_id,
          orderId: review.transaction_id,
          title: review.listing_title_snapshot || "Feedback",
          userLabel: formatAdminUserLabel(users.get(review.buyer_id)),
          actionRequiredSince: reportSince.get(review.id) || review.created_at,
        },
        nowMs
      )
    );
  }

  return items;
}

export type AdminBusinessMetrics = {
  totalListings: number;
  verifiedCount: number;
  soldCount: number;
  usersCount: number;
  txCount: number;
  gmv: number;
};

export async function getAdminBusinessMetrics(admin: AdminClient): Promise<AdminBusinessMetrics> {
  const [listingsRes, txRes, gmvRes, usersRes] = await Promise.all([
    admin.from("listings").select("id, status", { count: "exact" }),
    admin.from("transactions").select("id", { count: "exact", head: true }),
    admin.from("transactions").select("amount").in("status", ["complete", "shipped"]),
    admin.from("users").select("id", { count: "exact", head: true }),
  ]);

  const rows = listingsRes.data ?? [];
  return {
    totalListings: listingsRes.count ?? rows.length,
    verifiedCount: rows.filter((l) => l.status === "verified").length,
    soldCount: rows.filter((l) => l.status === "sold").length,
    usersCount: usersRes.count ?? 0,
    txCount: txRes.count ?? 0,
    gmv: (gmvRes.data ?? []).reduce((sum, t) => sum + (t.amount ?? 0), 0),
  };
}

export type AdminExceptionItem = {
  id: string;
  type: string;
  title: string;
  detail: string;
  href: string;
  since: string;
};

const STUCK_STATUSES = new Set([
  FulfilmentStatus.PAID,
  FulfilmentStatus.PACKAGING_SUBMITTED,
  FulfilmentStatus.PACKAGING_VERIFIED,
  FulfilmentStatus.LABEL_CREATED,
  FulfilmentStatus.SHIPPED,
  FulfilmentStatus.DELIVERED,
]);

export async function getAdminExceptions(
  admin: AdminClient,
  nowMs = Date.now()
): Promise<AdminExceptionItem[]> {
  const nowIso = new Date(nowMs).toISOString();
  const deliveryCutoff = new Date(nowMs - SLA.deliveryOverdueMs).toISOString();
  const stuckCutoff = new Date(nowMs - SLA.transactionStuckMs).toISOString();

  const [dispatchRes, overdueRes, unconfirmedRes, stuckRes, issueRes, cancelRes] = await Promise.all([
    admin
      .from("transactions")
      .select(
        "id, listing_id, fulfilment_status, dispatch_deadline_at, shipped_at, cancellation_status, listing:listings(model, category, brand, title)"
      )
      .eq("fulfilment_status", FulfilmentStatus.LABEL_CREATED)
      .is("shipped_at", null)
      .not("dispatch_deadline_at", "is", null)
      .lte("dispatch_deadline_at", nowIso)
      .limit(50),
    admin
      .from("transactions")
      .select(
        "id, listing_id, fulfilment_status, order_state, shipped_at, listing:listings(model, category, brand, title)"
      )
      .eq("status", "shipped")
      .not("shipped_at", "is", null)
      .lte("shipped_at", deliveryCutoff)
      .limit(50),
    admin
      .from("transactions")
      .select(
        "id, listing_id, status, fulfilment_status, order_state, buyer_confirmed_at, delivery_issue_reported_at, delivered_at, shipped_at, fulfilment_mode, listing:listings(model, category, brand, title)"
      )
      .in("status", ["shipped", "pending"])
      .is("buyer_confirmed_at", null)
      .is("delivery_issue_reported_at", null)
      .limit(80),
    admin
      .from("transactions")
      .select(
        "id, listing_id, status, fulfilment_status, packaging_status, fulfilment_status_changed_at, listing:listings(model, category, brand, title)"
      )
      .in("status", ["pending", "shipped"])
      .not("fulfilment_status_changed_at", "is", null)
      .lte("fulfilment_status_changed_at", stuckCutoff)
      .limit(80),
    admin
      .from("transactions")
      .select(
        "id, listing_id, delivery_issue_reported_at, listing:listings(model, category, brand, title)"
      )
      .not("delivery_issue_reported_at", "is", null)
      .is("delivery_issue_resolved_at", null)
      .limit(50),
    admin
      .from("transactions")
      .select("id, listing_id, cancellation_status, cancelled_at, listing:listings(model, category, brand, title)")
      .eq("cancellation_status", "failed")
      .limit(50),
  ]);

  const items: AdminExceptionItem[] = [];
  const seen = new Set<string>();

  const push = (item: AdminExceptionItem) => {
    const key = `${item.type}:${item.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  };

  for (const tx of dispatchRes.data ?? []) {
    if (tx.cancellation_status === "completed" || tx.cancellation_status === "in_progress") continue;
    push({
      id: tx.id,
      type: "seller_not_dispatched",
      title: listingTitleFromRel(tx.listing),
      detail: "Seller has not dispatched after the dispatch deadline.",
      href: `/admin/transactions/${tx.id}`,
      since: tx.dispatch_deadline_at as string,
    });
  }

  for (const tx of overdueRes.data ?? []) {
    if (
      tx.fulfilment_status === FulfilmentStatus.DELIVERED ||
      tx.order_state === "delivered" ||
      tx.fulfilment_status === FulfilmentStatus.COMPLETED
    ) {
      continue;
    }
    push({
      id: tx.id,
      type: "delivery_overdue",
      title: listingTitleFromRel(tx.listing),
      detail: "Not marked delivered within 7 days of dispatch.",
      href: `/admin/transactions/${tx.id}`,
      since: tx.shipped_at as string,
    });
  }

  for (const tx of unconfirmedRes.data ?? []) {
    const deliveredAt = tx.delivered_at ?? (tx.fulfilment_mode === "manual" ? tx.shipped_at : null);
    if (!deliveredAt) continue;
    if (new Date(deliveredAt).getTime() > nowMs - SLA.buyerNotConfirmedMs) continue;
    if (
      tx.fulfilment_status !== FulfilmentStatus.DELIVERED &&
      tx.order_state !== "delivered" &&
      tx.fulfilment_mode !== "manual"
    ) {
      continue;
    }
    if (tx.fulfilment_mode === "manual" && tx.status !== "shipped") continue;
    push({
      id: tx.id,
      type: "buyer_not_confirmed",
      title: listingTitleFromRel(tx.listing),
      detail: "Buyer has not confirmed delivery within 48 hours.",
      href: `/admin/transactions/${tx.id}`,
      since: deliveredAt,
    });
  }

  for (const tx of stuckRes.data ?? []) {
    const fs = tx.fulfilment_status ?? FulfilmentStatus.PAID;
    const isRejected = tx.packaging_status === "REJECTED";
    if (!STUCK_STATUSES.has(fs) && !isRejected) continue;
    if (fs === FulfilmentStatus.COMPLETED) continue;
    push({
      id: tx.id,
      type: "transaction_stuck",
      title: listingTitleFromRel(tx.listing),
      detail: "Stuck in the same fulfilment state for over 72 hours.",
      href: `/admin/transactions/${tx.id}`,
      since: tx.fulfilment_status_changed_at as string,
    });
  }

  for (const tx of issueRes.data ?? []) {
    push({
      id: tx.id,
      type: "delivery_issue",
      title: listingTitleFromRel(tx.listing),
      detail: "Buyer reported a delivery issue.",
      href: `/admin/transactions/${tx.id}`,
      since: tx.delivery_issue_reported_at as string,
    });
  }

  for (const tx of cancelRes.data ?? []) {
    push({
      id: tx.id,
      type: "cancellation_failed",
      title: listingTitleFromRel(tx.listing),
      detail: "Automatic cancellation failed and needs intervention.",
      href: `/admin/transactions/${tx.id}`,
      since: (tx.cancelled_at as string) || new Date(nowMs).toISOString(),
    });
  }

  return items.sort((a, b) => new Date(a.since).getTime() - new Date(b.since).getTime());
}

export type ListingVerificationDetail = {
  actionType: typeof AdminActionType.VERIFY_LISTING;
  listing: {
    id: string;
    user_id: string;
    category: string;
    brand: string | null;
    model: string | null;
    title: string | null;
    displayTitle: string;
    condition: string;
    price: number;
    description: string | null;
    shaft: string | null;
    degree: string | null;
    shaft_flex: string | null;
    lie_angle?: string | null;
    club_length?: string | null;
    shaft_weight?: string | null;
    shaft_material?: string | null;
    grip_brand?: string | null;
    grip_model?: string | null;
    grip_size?: string | null;
    grip_condition?: string | null;
    handed: string | null;
    listing_format?: string | null;
    standard_spec_status?: string | null;
    iron_number?: string | null;
    set_composition?: string[] | null;
    bounce?: string | null;
    grind?: string | null;
    head_number?: string | null;
    headcover_included?: boolean | null;
    listing_clubs?: {
      id: string;
      listing_id: string;
      sort_order: number;
      club_type: string;
      iron_number: string | null;
      degree: string | null;
      bounce: string | null;
      grind: string | null;
      shaft: string | null;
      shaft_flex: string | null;
      created_at: string;
    }[];
    item_type: string | null;
    size: string | null;
    colour: string | null;
    status: string;
    created_at: string;
    admin_feedback: string | null;
    imageUrls: string[];
  };
  seller: {
    id: string;
    email: string | null;
    name: string;
    role: string | null;
    created_at: string | null;
  } | null;
};

export type PackagingVerificationDetail = {
  actionType: typeof AdminActionType.REVIEW_PACKAGING;
  transaction: {
    id: string;
    listing_id: string;
    created_at: string;
    packaging_status: string | null;
    packaging_source: string | null;
    shipping_package: string | null;
    box_type: string | null;
    box_type_label: string | null;
    packaging_review_notes: string | null;
    review_notes: string | null;
    photoCount: number;
    photoLabels: string[];
  };
  title: string;
  seller: { name: string; email: string | null };
  timeline: ReturnType<typeof buildOrderWorkflowTimeline>;
};

export type StarterPackDispatchDetail = {
  actionType: typeof AdminActionType.DISPATCH_STARTER_PACK;
  transaction: {
    id: string;
    listing_id: string;
    created_at: string;
    packaging_requested_at: string | null;
    starter_pack_dispatched_at: string | null;
    starter_pack_courier: string | null;
    starter_pack_tracking_number: string | null;
    starter_pack_tracking_url: string | null;
    box_type: string | null;
    box_type_label: string | null;
    seller_address: string;
  };
  title: string;
  seller: { name: string; email: string | null };
  timeline: ReturnType<typeof buildOrderWorkflowTimeline>;
};

export type ShippingLabelDetail = {
  actionType: typeof AdminActionType.CREATE_LABEL;
  transaction: {
    id: string;
    listing_id: string;
    created_at: string;
    shipping_fee_gbp: number | null;
    shipping_address: string;
    buyer_name: string | null;
  };
  title: string;
  seller: { name: string; email: string | null };
  buyer: { name: string; email: string | null };
  timeline: ReturnType<typeof buildOrderWorkflowTimeline>;
};

export type FeedbackReviewDetail = {
  actionType: typeof AdminActionType.REVIEW_FEEDBACK;
  review: Record<string, unknown>;
  reports: Record<string, unknown>[];
  moderation_events: Record<string, unknown>[];
};

export type AdminActionDetail =
  | ListingVerificationDetail
  | PackagingVerificationDetail
  | StarterPackDispatchDetail
  | ShippingLabelDetail
  | FeedbackReviewDetail;

function person(u: UserNameRow | undefined, fallback?: string | null) {
  return {
    name: formatAdminUserLabel(u) === "Unknown" && fallback ? fallback : formatAdminUserLabel(u) || fallback || "—",
    email: u?.email ?? null,
  };
}

function boxLabel(boxType: string | null | undefined): string | null {
  if (boxType && boxType in BOX_TYPE_LABELS) return BOX_TYPE_LABELS[boxType as BoxType];
  return boxType ?? null;
}

export async function getAdminActionDetail(
  admin: AdminClient,
  actionType: AdminActionTypeValue,
  entityId: string
): Promise<AdminActionDetail | null> {
  if (actionType === AdminActionType.VERIFY_LISTING) {
    const { data: listing, error } = await admin
      .from("listings")
      .select(
        "id, user_id, category, brand, model, title, condition, price, description, shaft, degree, shaft_flex, lie_angle, club_length, shaft_weight, shaft_material, grip_brand, grip_model, grip_size, grip_condition, handed, listing_format, standard_spec_status, iron_number, set_composition, bounce, grind, head_number, headcover_included, item_type, size, colour, status, created_at, admin_feedback, listing_images(storage_path, sort_order), listing_clubs(id, listing_id, sort_order, club_type, iron_number, degree, bounce, grind, shaft, shaft_flex, created_at)"
      )
      .eq("id", entityId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!listing) return null;
    const images = ((listing.listing_images ?? []) as { storage_path: string; sort_order: number }[]).sort(
      (a, b) => a.sort_order - b.sort_order
    );
    const { data: seller } = listing.user_id
      ? await admin
          .from("users")
          .select("id, email, first_name, surname, role, created_at")
          .eq("id", listing.user_id)
          .maybeSingle()
      : { data: null };
    const l = listing as Record<string, unknown>;
    return {
      actionType,
      listing: {
        id: listing.id,
        user_id: listing.user_id,
        category: listing.category,
        brand: listing.brand,
        model: listing.model,
        title: listing.title,
        displayTitle: getListingDisplayTitle(listing as unknown as Listing),
        condition: listing.condition,
        price: listing.price,
        description: listing.description,
        shaft: listing.shaft,
        degree: listing.degree,
        shaft_flex: listing.shaft_flex,
        lie_angle: (l.lie_angle as string | null) ?? null,
        club_length: (l.club_length as string | null) ?? null,
        shaft_weight: (l.shaft_weight as string | null) ?? null,
        shaft_material: (l.shaft_material as string | null) ?? null,
        grip_brand: (l.grip_brand as string | null) ?? null,
        grip_model: (l.grip_model as string | null) ?? null,
        grip_size: (l.grip_size as string | null) ?? null,
        grip_condition: (l.grip_condition as string | null) ?? null,
        handed: listing.handed,
        listing_format: (l.listing_format as string | null) ?? null,
        standard_spec_status: (l.standard_spec_status as string | null) ?? null,
        iron_number: (l.iron_number as string | null) ?? null,
        set_composition: (l.set_composition as string[] | null) ?? null,
        bounce: (l.bounce as string | null) ?? null,
        grind: (l.grind as string | null) ?? null,
        head_number: (l.head_number as string | null) ?? null,
        headcover_included: (l.headcover_included as boolean | null) ?? null,
        listing_clubs:
          (l.listing_clubs as ListingVerificationDetail["listing"]["listing_clubs"]) ?? [],
        item_type: listing.item_type,
        size: listing.size,
        colour: listing.colour,
        status: listing.status,
        created_at: listing.created_at,
        admin_feedback: listing.admin_feedback,
        imageUrls: images.map((img) => getListingImageUrl(img.storage_path, "main")),
      },
      seller: seller
        ? {
            id: seller.id,
            email: seller.email,
            name: formatAdminUserLabel(seller),
            role: seller.role,
            created_at: seller.created_at,
          }
        : null,
    };
  }

  if (actionType === AdminActionType.REVIEW_PACKAGING) {
    const { data: tx, error } = await admin
      .from("transactions")
      .select(
        "id, listing_id, seller_id, created_at, packaging_photos, packaging_status, packaging_source, shipping_package, box_type, packaging_review_notes, review_notes, fulfilment_status, fulfilment_mode, packaging_requested_at, starter_pack_dispatched_at, shipping_label_url, shippo_label_url, shipped_at, delivered_at, buyer_confirmed_at, completed_at, status, order_state, listing:listings(model, category, brand, title, item_type, size)"
      )
      .eq("id", entityId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!tx) return null;
    const users = await loadUsersByIds(admin, [tx.seller_id]);
    const count = photoCount(tx.packaging_photos);
    return {
      actionType,
      transaction: {
        id: tx.id,
        listing_id: tx.listing_id,
        created_at: tx.created_at,
        packaging_status: tx.packaging_status,
        packaging_source: tx.packaging_source,
        shipping_package: tx.shipping_package,
        box_type: tx.box_type,
        box_type_label: boxLabel(tx.box_type),
        packaging_review_notes: tx.packaging_review_notes,
        review_notes: tx.review_notes,
        photoCount: count,
        photoLabels: PACKAGING_PHOTO_LABELS.slice(0, Math.max(count, 0)) as unknown as string[],
      },
      title: listingTitleFromRel(tx.listing),
      seller: person(users.get(tx.seller_id)),
      timeline: buildOrderWorkflowTimeline(tx),
    };
  }

  if (actionType === AdminActionType.DISPATCH_STARTER_PACK) {
    const { data: tx, error } = await admin
      .from("transactions")
      .select(
        "id, listing_id, seller_id, created_at, packaging_requested_at, starter_pack_dispatched_at, starter_pack_courier, starter_pack_tracking_number, starter_pack_tracking_url, box_type, packaging_source, packaging_status, packaging_photos, fulfilment_status, fulfilment_mode, shipping_label_url, shippo_label_url, shipped_at, delivered_at, buyer_confirmed_at, completed_at, status, order_state, listing:listings(model, category, brand, title, item_type, size)"
      )
      .eq("id", entityId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!tx) return null;
    const users = await loadUsersByIds(admin, [tx.seller_id]);
    const seller = users.get(tx.seller_id);
    return {
      actionType,
      transaction: {
        id: tx.id,
        listing_id: tx.listing_id,
        created_at: tx.created_at,
        packaging_requested_at: tx.packaging_requested_at,
        starter_pack_dispatched_at: tx.starter_pack_dispatched_at,
        starter_pack_courier: tx.starter_pack_courier,
        starter_pack_tracking_number: tx.starter_pack_tracking_number,
        starter_pack_tracking_url: tx.starter_pack_tracking_url,
        box_type: tx.box_type,
        box_type_label: boxLabel(tx.box_type),
        seller_address: seller ? formatSellerAddress(seller) : "",
      },
      title: listingTitleFromRel(tx.listing),
      seller: person(seller),
      timeline: buildOrderWorkflowTimeline(tx),
    };
  }

  if (actionType === AdminActionType.CREATE_LABEL) {
    const { data: tx, error } = await admin
      .from("transactions")
      .select(
        `id, listing_id, seller_id, buyer_id, created_at, shipping_fee_gbp, fulfilment_status, fulfilment_mode,
         buyer_name, buyer_address_line1, buyer_address_line2, buyer_city, buyer_postcode, buyer_country,
         packaging_source, packaging_status, packaging_photos, packaging_requested_at, starter_pack_dispatched_at,
         shipping_label_url, shippo_label_url, shipped_at, delivered_at, buyer_confirmed_at, completed_at, status, order_state,
         listing:listings(model, category, brand, title, item_type, size)`
      )
      .eq("id", entityId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!tx) return null;
    const users = await loadUsersByIds(admin, [tx.seller_id, tx.buyer_id].filter(Boolean));
    const addressParts = [
      tx.buyer_name,
      tx.buyer_address_line1,
      tx.buyer_address_line2,
      tx.buyer_city,
      tx.buyer_postcode,
      tx.buyer_country,
    ].filter((p): p is string => !!p && String(p).trim().length > 0);
    return {
      actionType,
      transaction: {
        id: tx.id,
        listing_id: tx.listing_id,
        created_at: tx.created_at,
        shipping_fee_gbp: tx.shipping_fee_gbp,
        shipping_address: addressParts.join(", "),
        buyer_name: tx.buyer_name,
      },
      title: listingTitleFromRel(tx.listing),
      seller: person(users.get(tx.seller_id)),
      buyer: person(users.get(tx.buyer_id), tx.buyer_name),
      timeline: buildOrderWorkflowTimeline(tx),
    };
  }

  if (actionType === AdminActionType.REVIEW_FEEDBACK) {
    const { data: review, error } = await admin.from("seller_reviews").select("*").eq("id", entityId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!review) return null;
    const [{ data: reports }, { data: events }, { data: users }] = await Promise.all([
      admin.from("seller_review_reports").select("*").eq("review_id", entityId).order("created_at", { ascending: false }),
      admin
        .from("seller_review_moderation_events")
        .select("*")
        .eq("review_id", entityId)
        .order("created_at", { ascending: false }),
      admin
        .from("users")
        .select("id, display_name, email, first_name, surname")
        .in("id", [review.buyer_id, review.seller_id, review.moderated_by].filter(Boolean)),
    ]);
    const nameMap = new Map<string, string>();
    for (const u of users ?? []) {
      nameMap.set(u.id, formatAdminUserLabel(u) !== "Unknown" ? formatAdminUserLabel(u) : u.display_name || u.email || u.id.slice(0, 8));
    }
    return {
      actionType,
      review: {
        ...review,
        buyer_name: nameMap.get(review.buyer_id),
        seller_name: nameMap.get(review.seller_id),
        moderated_by_name: review.moderated_by ? nameMap.get(review.moderated_by) : null,
      },
      reports: (reports ?? []).map((r) => ({
        ...r,
        reason_label:
          REVIEW_REPORT_REASON_LABELS[r.reason as keyof typeof REVIEW_REPORT_REASON_LABELS] ?? r.reason,
      })),
      moderation_events: events ?? [],
    };
  }

  return null;
}
