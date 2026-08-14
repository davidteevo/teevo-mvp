import type { SupabaseClient } from "@supabase/supabase-js";
import { getListingImageUrl } from "@/lib/listing-images";
import { getListingTitle } from "@/lib/notifications";

export const REVIEW_TEXT_MAX = 1000;
export const EDIT_WINDOW_MS = 48 * 60 * 60 * 1000;
export const FEEDBACK_REMINDER_MS = 3 * 24 * 60 * 60 * 1000;

export const SellerReviewStatus = {
  ACTIVE: "active",
  HIDDEN: "hidden",
  REMOVED: "removed",
} as const;
export type SellerReviewStatusValue =
  (typeof SellerReviewStatus)[keyof typeof SellerReviewStatus];

export const ReviewReportReason = {
  ABUSIVE: "abusive",
  SPAM: "spam",
  FRAUDULENT: "fraudulent",
  MISLEADING: "misleading",
  PERSONAL_INFORMATION: "personal_information",
  HARASSMENT: "harassment",
  NOT_RELEVANT: "not_relevant",
  OTHER: "other",
} as const;
export type ReviewReportReasonValue =
  (typeof ReviewReportReason)[keyof typeof ReviewReportReason];

export const REVIEW_REPORT_REASON_LABELS: Record<ReviewReportReasonValue, string> = {
  abusive: "Abusive or offensive content",
  spam: "Spam",
  fraudulent: "Fraudulent feedback",
  misleading: "Misleading feedback",
  personal_information: "Personal information",
  harassment: "Harassment",
  not_relevant: "Not relevant to the transaction",
  other: "Other",
};

export const REVIEW_REPORT_REASONS = Object.values(ReviewReportReason);

export const ModerationAction = {
  KEEP: "keep",
  HIDE: "hide",
  RESTORE: "restore",
  REMOVE: "remove",
} as const;
export type ModerationActionValue = (typeof ModerationAction)[keyof typeof ModerationAction];

export const FEEDBACK_EVENTS = {
  REQUEST_SENT: "feedback_request_sent",
  NOTIFICATION_OPENED: "feedback_notification_opened",
  EMAIL_RATING_CLICKED: "feedback_email_rating_clicked",
  FORM_OPENED: "feedback_form_opened",
  SUBMITTED: "feedback_submitted",
  WITH_TEXT_SUBMITTED: "feedback_with_text_submitted",
  REMINDER_SENT: "feedback_reminder_sent",
  VIEWED: "feedback_viewed",
  AUTH_GATE_SHOWN: "feedback_auth_gate_shown",
  REPORTED: "feedback_reported",
  ADMIN_NOTIFICATION_SENT: "feedback_admin_notification_sent",
  ADMIN_EMAIL_SENT: "feedback_admin_email_sent",
  ADMIN_REVIEW_OPENED: "feedback_admin_review_opened",
  MODERATED: "feedback_moderated",
  HIDDEN: "feedback_hidden",
  RESTORED: "feedback_restored",
  REMOVED: "feedback_removed",
} as const;

export type SellerReviewRow = {
  id: string;
  transaction_id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  rating: number;
  review_text: string | null;
  listing_title_snapshot: string;
  status: string;
  editable_until: string;
  requires_admin_action: boolean;
  moderated_at: string | null;
  moderated_by: string | null;
  moderation_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type SellerPublicProfile = {
  id: string;
  display_name: string | null;
  avatar_path: string | null;
  founding_seller_rank: number | null;
  rating_average: number | null;
  rating_count: number;
};

export function isReviewReportReason(value: unknown): value is ReviewReportReasonValue {
  return typeof value === "string" && REVIEW_REPORT_REASONS.includes(value as ReviewReportReasonValue);
}

export function isModerationAction(value: unknown): value is ModerationActionValue {
  return (
    value === ModerationAction.KEEP ||
    value === ModerationAction.HIDE ||
    value === ModerationAction.RESTORE ||
    value === ModerationAction.REMOVE
  );
}

export function parseRating(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
}

export function sanitizeReviewText(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, REVIEW_TEXT_MAX);
}

export function publicAvatarUrl(avatarPath: string | null | undefined): string | null {
  if (!avatarPath) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/avatars/${avatarPath}`;
}

export function formatRatingAverage(average: number | null | undefined): string | null {
  if (average == null || Number.isNaN(Number(average))) return null;
  return Number(average).toFixed(1);
}

export function formatReviewDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export function isEditWindowOpen(editableUntil: string | null | undefined): boolean {
  if (!editableUntil) return false;
  return new Date(editableUntil).getTime() > Date.now();
}

export function feedbackFormUrl(transactionId: string, rating?: number | null): string {
  const base = `/feedback/${encodeURIComponent(transactionId)}`;
  if (rating && rating >= 1 && rating <= 5) {
    return `${base}?rating=${rating}`;
  }
  return base;
}

export function sellerProfileUrl(sellerId: string, reviewId?: string | null): string {
  const base = `/seller/${encodeURIComponent(sellerId)}`;
  return reviewId ? `${base}#review-${encodeURIComponent(reviewId)}` : base;
}

export function adminFeedbackUrl(reviewId: string): string {
  return `/admin/feedback/${encodeURIComponent(reviewId)}`;
}

export function adminFeedbackListUrl(reviewId?: string | null): string {
  return reviewId
    ? `/admin/feedback?id=${encodeURIComponent(reviewId)}`
    : "/admin/feedback";
}

type TxEligibilityRow = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  status: string;
  delivery_issue_reported_at?: string | null;
};

export type EligibilityOk = {
  ok: true;
  tx: TxEligibilityRow;
  existing: SellerReviewRow | null;
};

export type EligibilityFail = {
  ok: false;
  status: number;
  error: string;
  existing?: SellerReviewRow | null;
};

export async function getReviewByTransaction(
  admin: SupabaseClient,
  transactionId: string
): Promise<SellerReviewRow | null> {
  const { data } = await admin
    .from("seller_reviews")
    .select("*")
    .eq("transaction_id", transactionId)
    .maybeSingle();
  return (data as SellerReviewRow | null) ?? null;
}

export async function checkCreateEligibility(
  admin: SupabaseClient,
  opts: { transactionId: string; buyerUserId: string }
): Promise<EligibilityOk | EligibilityFail> {
  const { data: tx } = await admin
    .from("transactions")
    .select("id, listing_id, buyer_id, seller_id, status, delivery_issue_reported_at")
    .eq("id", opts.transactionId)
    .maybeSingle();

  if (!tx) {
    return { ok: false, status: 404, error: "Transaction not found" };
  }
  if (tx.buyer_id !== opts.buyerUserId) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  const existing = await getReviewByTransaction(admin, tx.id);
  if (existing) {
    return {
      ok: false,
      status: 409,
      error: "Feedback has already been submitted for this purchase",
      existing,
    };
  }

  if (tx.status === "refunded") {
    return { ok: false, status: 400, error: "This order was refunded" };
  }
  if (tx.status === "dispute") {
    return { ok: false, status: 400, error: "This order is under review" };
  }
  if (tx.delivery_issue_reported_at) {
    return { ok: false, status: 400, error: "A delivery issue was reported for this order" };
  }
  if (tx.status !== "complete") {
    return { ok: false, status: 400, error: "Feedback is available after you confirm delivery" };
  }

  return { ok: true, tx: tx as TxEligibilityRow, existing: null };
}

export async function loadFeedbackFormContext(
  admin: SupabaseClient,
  opts: { transactionId: string; buyerUserId: string }
): Promise<
  | {
      ok: true;
      tx: TxEligibilityRow;
      existing: SellerReviewRow | null;
      canCreate: boolean;
      canEdit: boolean;
      seller: {
        id: string;
        display_name: string | null;
        avatar_url: string | null;
      };
      listing: {
        id: string;
        title: string;
        image_url: string | null;
      };
    }
  | EligibilityFail
> {
  const { data: tx } = await admin
    .from("transactions")
    .select("id, listing_id, buyer_id, seller_id, status, delivery_issue_reported_at")
    .eq("id", opts.transactionId)
    .maybeSingle();

  if (!tx) return { ok: false, status: 404, error: "Transaction not found" };
  if (tx.buyer_id !== opts.buyerUserId) return { ok: false, status: 403, error: "Forbidden" };

  const existing = await getReviewByTransaction(admin, tx.id);
  const canCreate = !existing && tx.status === "complete" && !tx.delivery_issue_reported_at;
  const canEdit =
    !!existing &&
    existing.buyer_id === opts.buyerUserId &&
    existing.status === SellerReviewStatus.ACTIVE &&
    isEditWindowOpen(existing.editable_until);

  const [{ data: seller }, title, { data: images }] = await Promise.all([
    admin
      .from("users")
      .select("id, display_name, avatar_path")
      .eq("id", tx.seller_id)
      .maybeSingle(),
    getListingTitle(admin, tx.listing_id),
    admin
      .from("listing_images")
      .select("storage_path, sort_order")
      .eq("listing_id", tx.listing_id)
      .order("sort_order", { ascending: true })
      .limit(1),
  ]);

  const firstImage = images?.[0]?.storage_path;
  return {
    ok: true,
    tx: tx as TxEligibilityRow,
    existing,
    canCreate,
    canEdit,
    seller: {
      id: tx.seller_id,
      display_name: seller?.display_name?.trim() || "Seller",
      avatar_url: publicAvatarUrl(seller?.avatar_path),
    },
    listing: {
      id: tx.listing_id,
      title,
      image_url: firstImage ? getListingImageUrl(firstImage, "thumb") : null,
    },
  };
}

export async function getSellerPublicProfile(
  admin: SupabaseClient,
  sellerId: string
): Promise<SellerPublicProfile | null> {
  const { data } = await admin
    .from("seller_public_profiles")
    .select("id, display_name, avatar_path, founding_seller_rank, rating_average, rating_count")
    .eq("id", sellerId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    display_name: data.display_name ?? null,
    avatar_path: data.avatar_path ?? null,
    founding_seller_rank:
      typeof data.founding_seller_rank === "number" ? data.founding_seller_rank : null,
    rating_average: data.rating_average != null ? Number(data.rating_average) : null,
    rating_count: typeof data.rating_count === "number" ? data.rating_count : 0,
  };
}

export async function createSellerReview(
  admin: SupabaseClient,
  opts: { transactionId: string; buyerUserId: string; rating: number; reviewText?: string | null }
): Promise<{ ok: true; review: SellerReviewRow } | EligibilityFail> {
  const eligibility = await checkCreateEligibility(admin, {
    transactionId: opts.transactionId,
    buyerUserId: opts.buyerUserId,
  });
  if (!eligibility.ok) return eligibility;

  const title = await getListingTitle(admin, eligibility.tx.listing_id);
  const now = new Date();
  const insert = {
    transaction_id: eligibility.tx.id,
    listing_id: eligibility.tx.listing_id,
    buyer_id: eligibility.tx.buyer_id,
    seller_id: eligibility.tx.seller_id,
    rating: opts.rating,
    review_text: opts.reviewText ?? null,
    listing_title_snapshot: title,
    status: SellerReviewStatus.ACTIVE,
    editable_until: new Date(now.getTime() + EDIT_WINDOW_MS).toISOString(),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  const { data, error } = await admin.from("seller_reviews").insert(insert).select("*").single();
  if (error) {
    if (error.code === "23505") {
      const existing = await getReviewByTransaction(admin, opts.transactionId);
      return {
        ok: false,
        status: 409,
        error: "Feedback has already been submitted for this purchase",
        existing,
      };
    }
    return { ok: false, status: 500, error: error.message };
  }
  return { ok: true, review: data as SellerReviewRow };
}

export async function updateSellerReview(
  admin: SupabaseClient,
  opts: { reviewId: string; buyerUserId: string; rating?: number; reviewText?: string | null }
): Promise<{ ok: true; review: SellerReviewRow } | EligibilityFail> {
  const { data: existing } = await admin
    .from("seller_reviews")
    .select("*")
    .eq("id", opts.reviewId)
    .maybeSingle();
  const review = existing as SellerReviewRow | null;
  if (!review) return { ok: false, status: 404, error: "Feedback not found" };
  if (review.buyer_id !== opts.buyerUserId) return { ok: false, status: 403, error: "Forbidden" };
  if (review.status !== SellerReviewStatus.ACTIVE) {
    return { ok: false, status: 400, error: "This feedback can no longer be edited" };
  }
  if (!isEditWindowOpen(review.editable_until)) {
    return { ok: false, status: 400, error: "The edit window for this feedback has closed" };
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (opts.rating != null) patch.rating = opts.rating;
  if (opts.reviewText !== undefined) patch.review_text = opts.reviewText;

  const { data, error } = await admin
    .from("seller_reviews")
    .update(patch)
    .eq("id", opts.reviewId)
    .eq("buyer_id", opts.buyerUserId)
    .select("*")
    .single();
  if (error) return { ok: false, status: 500, error: error.message };
  return { ok: true, review: data as SellerReviewRow };
}

export async function reportSellerReview(
  admin: SupabaseClient,
  opts: {
    reviewId: string;
    reporterId: string;
    reason: ReviewReportReasonValue;
    details?: string | null;
  }
): Promise<
  | { ok: true; reportId: string; firstOpenReport: boolean; review: SellerReviewRow }
  | EligibilityFail
> {
  const { data: existing } = await admin
    .from("seller_reviews")
    .select("*")
    .eq("id", opts.reviewId)
    .maybeSingle();
  const review = existing as SellerReviewRow | null;
  if (!review) return { ok: false, status: 404, error: "Feedback not found" };
  if (review.buyer_id === opts.reporterId) {
    return { ok: false, status: 400, error: "You cannot report your own feedback" };
  }

  const details =
    opts.reason === ReviewReportReason.OTHER
      ? (opts.details?.trim() || null)
      : (opts.details?.trim() || null);
  if (opts.reason === ReviewReportReason.OTHER && !details) {
    return { ok: false, status: 400, error: "Please add a short explanation" };
  }

  const alreadyRequiredAction = review.requires_admin_action === true;

  const { data: report, error } = await admin
    .from("seller_review_reports")
    .insert({
      review_id: opts.reviewId,
      reporter_id: opts.reporterId,
      reason: opts.reason,
      details,
      status: "open",
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, status: 409, error: "You have already reported this review" };
    }
    return { ok: false, status: 500, error: error.message };
  }

  let firstOpenReport = !alreadyRequiredAction;
  if (!alreadyRequiredAction) {
    const { data: updated } = await admin
      .from("seller_reviews")
      .update({ requires_admin_action: true, updated_at: new Date().toISOString() })
      .eq("id", opts.reviewId)
      .eq("requires_admin_action", false)
      .select("id")
      .maybeSingle();
    firstOpenReport = !!updated;
  }

  const { data: latest } = await admin
    .from("seller_reviews")
    .select("*")
    .eq("id", opts.reviewId)
    .single();

  return {
    ok: true,
    reportId: report.id,
    firstOpenReport,
    review: (latest as SellerReviewRow) ?? review,
  };
}

export async function moderateSellerReview(
  admin: SupabaseClient,
  opts: {
    reviewId: string;
    adminId: string;
    action: ModerationActionValue;
    reason?: string | null;
  }
): Promise<{ ok: true; review: SellerReviewRow } | EligibilityFail> {
  const { data: existing } = await admin
    .from("seller_reviews")
    .select("*")
    .eq("id", opts.reviewId)
    .maybeSingle();
  const review = existing as SellerReviewRow | null;
  if (!review) return { ok: false, status: 404, error: "Feedback not found" };

  const reason = opts.reason?.trim() || null;
  if (
    (opts.action === ModerationAction.HIDE || opts.action === ModerationAction.REMOVE) &&
    !reason
  ) {
    return { ok: false, status: 400, error: "A moderation reason is required" };
  }

  const previousStatus = review.status;
  let newStatus = previousStatus;
  if (opts.action === ModerationAction.HIDE) newStatus = SellerReviewStatus.HIDDEN;
  if (opts.action === ModerationAction.REMOVE) newStatus = SellerReviewStatus.REMOVED;
  if (opts.action === ModerationAction.RESTORE) newStatus = SellerReviewStatus.ACTIVE;

  const now = new Date().toISOString();
  const { data: updated, error } = await admin
    .from("seller_reviews")
    .update({
      status: newStatus,
      requires_admin_action: false,
      moderated_at: now,
      moderated_by: opts.adminId,
      moderation_reason: reason ?? review.moderation_reason,
      updated_at: now,
    })
    .eq("id", opts.reviewId)
    .select("*")
    .single();
  if (error) return { ok: false, status: 500, error: error.message };

  await admin.from("seller_review_reports").update({
    status: "resolved",
    resolved_at: now,
    resolved_by: opts.adminId,
    resolution: opts.action,
  }).eq("review_id", opts.reviewId).eq("status", "open");

  await admin.from("seller_review_moderation_events").insert({
    review_id: opts.reviewId,
    admin_id: opts.adminId,
    action: opts.action,
    previous_status: previousStatus,
    new_status: newStatus,
    reason,
  });

  return { ok: true, review: updated as SellerReviewRow };
}
