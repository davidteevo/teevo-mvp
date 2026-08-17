import type { EmailAttachment, EmailType } from "@/lib/email";
import { listingHeroImageHtml, sendEmail } from "@/lib/email";
import type { SupabaseClient } from "@supabase/supabase-js";
import { firstListingImageUrl, type ListingImageRow } from "@/lib/listing-images";
import { normalizeListingTitleForCategory } from "@/lib/listing-categories";

/** Email types from the Automated Emails spec. Used for idempotency key. */
export const EmailTriggerType = {
  ORDER_CONFIRMATION: "order_confirmation",
  ITEM_SOLD: "item_sold",
  PAYMENT_RECEIVED: "payment_received",
  SHIPPING_CONFIRMATION: "shipping_confirmation",
  SHIPPING_LABEL_READY: "shipping_label_ready",
  ITEM_DISPATCHED: "item_dispatched",
  FUNDS_RELEASED: "funds_released",
  REVIEW_REQUEST: "review_request",
  REVIEW_REQUEST_REMINDER: "review_request_reminder",
  FEEDBACK_REQUIRES_REVIEW_ADMIN: "feedback_requires_review_admin",
  PAYOUT_CONFIRMATION: "payout_confirmation",
  KYC_INCOMPLETE_REMINDER: "kyc_incomplete_reminder",
  EMAIL_VERIFICATION: "email_verification",
  FORGOT_PASSWORD: "forgot_password",
  LISTING_EDITS_REQUESTED: "listing_edits_requested",
  MESSAGE_RECEIVED: "message_received",
  OFFER_MADE: "offer_made",
  OFFER_ACCEPTED: "offer_accepted",
  OFFER_DECLINED: "offer_declined",
  OFFER_COUNTERED: "offer_countered",
  NEW_LISTING_PENDING: "new_listing_pending",
  ACCOUNT_AND_LISTING_CREATED: "account_and_listing_created",
  PACKAGING_APPROVED: "packaging_approved",
  PACKAGING_REJECTED: "packaging_rejected",
  PACKAGING_SUBMITTED_ADMIN: "packaging_submitted_admin",
  MANUAL_LABEL_NEEDED_ADMIN: "manual_label_needed_admin",
  STARTER_PACK_REQUESTED: "starter_pack_requested",
  STARTER_PACK_REQUESTED_ADMIN: "starter_pack_requested_admin",
  STARTER_PACK_DISPATCHED: "starter_pack_dispatched",
  WATCHLIST_STILL_AVAILABLE: "watchlist_still_available",
  WATCHLIST_NOW_AVAILABLE: "watchlist_now_available",
  WATCHLIST_PRICE_DROP: "watchlist_price_drop",
  WATCHLIST_SOLD: "watchlist_sold",
  WATCHLIST_UNAVAILABLE: "watchlist_unavailable",
  DISPATCH_REMINDER: "dispatch_reminder",
  DISPATCH_ONE_DAY_LEFT: "dispatch_one_day_left",
  DISPATCH_REQUIRED_TODAY: "dispatch_required_today",
  DISPATCH_EXTENSION_REQUESTED: "dispatch_extension_requested",
  DISPATCH_EXTENSION_APPROVED: "dispatch_extension_approved",
  DISPATCH_EXTENSION_DECLINED: "dispatch_extension_declined",
  ORDER_CANCELLED_DISPATCH_TIMEOUT_SELLER: "order_cancelled_dispatch_timeout_seller",
  ORDER_CANCELLED_SELLER_TIMEOUT_BUYER: "order_cancelled_seller_timeout_buyer",
  CONFIRM_LISTING_AVAILABILITY: "confirm_listing_availability",
  DISPATCH_CANCELLATION_FAILED_ADMIN: "dispatch_cancellation_failed_admin",
  REFERRAL_CREDIT_EARNED: "referral_credit_earned",
} as const;

export type EmailTriggerTypeValue = (typeof EmailTriggerType)[keyof typeof EmailTriggerType];

const LISTING_EMAIL_SELECT = "brand, model, title, category, listing_images(storage_path, sort_order)";

export function listingItemName(listing: {
  brand?: string | null;
  model?: string | null;
  title?: string | null;
  category?: string | null;
} | null | undefined): string {
  if (!listing) return "Your item";
  const title = typeof listing.title === "string" ? listing.title.trim() : "";
  if (title) return normalizeListingTitleForCategory(title, listing.category);
  const fromParts = [listing.brand, listing.model].filter(Boolean).join(" ").trim();
  return fromParts || "Your item";
}

export function listingHeroFromImages(
  images: ListingImageRow[] | null | undefined,
  alt?: string
): string {
  return listingHeroImageHtml(firstListingImageUrl(images), alt);
}

export async function getListingEmailContext(
  admin: SupabaseClient,
  listingId: string | null | undefined
): Promise<{ itemName: string; hero_image: string }> {
  if (!listingId) return { itemName: "Your item", hero_image: "" };
  const { data } = await admin
    .from("listings")
    .select(LISTING_EMAIL_SELECT)
    .eq("id", listingId)
    .maybeSingle();
  const listing = data as {
    brand?: string | null;
    model?: string | null;
    title?: string | null;
    category?: string | null;
    listing_images?: ListingImageRow[] | null;
  } | null;
  const itemName = listingItemName(listing);
  return {
    itemName,
    hero_image: listingHeroFromImages(listing?.listing_images, itemName),
  };
}

/**
 * Idempotent send: if we already sent this email_type + reference_id, skip.
 * Otherwise send and record in sent_emails so webhook retries don't duplicate.
 */
export async function ensureEmailSent(
  admin: SupabaseClient,
  opts: {
    emailType: EmailTriggerTypeValue;
    referenceId: string;
    referenceType?: "transaction" | "user" | "listing" | "message" | "offer" | "watchlist" | "review";
    recipientId?: string | null;
    to: string | string[];
    subject: string;
    type: EmailType;
    variables: Record<string, string>;
    attachments?: EmailAttachment[];
  }
): Promise<boolean> {
  const {
    emailType,
    referenceId,
    referenceType = "transaction",
    recipientId,
    to,
    subject,
    type,
    variables,
    attachments,
  } = opts;

  const { data: existing } = await admin
    .from("sent_emails")
    .select("id")
    .eq("email_type", emailType)
    .eq("reference_id", referenceId)
    .maybeSingle();

  if (existing) {
    return false;
  }

  await sendEmail({ type, to, subject, variables, attachments });

  await admin.from("sent_emails").insert({
    email_type: emailType,
    reference_type: referenceType,
    reference_id: referenceId,
    recipient_id: recipientId ?? null,
  });

  return true;
}

/** Format pence as GBP string for emails. */
export function formatGbp(pence: number): string {
  return (pence / 100).toFixed(2);
}
