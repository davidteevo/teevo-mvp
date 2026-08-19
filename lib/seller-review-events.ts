/**
 * Seller-review domain events: in-app notifications + transactional emails.
 * Never throws.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAppUrl } from "@/lib/app-env";
import { ensureEmailSent, EmailTriggerType, getListingEmailContext } from "@/lib/email-triggers";
import { getAdminAlertEmail, clearSentEmail } from "@/lib/fulfilment-emails";
import {
  adminFeedbackUrl,
  createNotification,
  feedbackUrl,
  getListingTitle,
  NotificationEntityType,
  NotificationType,
  notifyAdmins,
  resolveNotifications,
  sellerUrl,
} from "@/lib/notifications";
import {
  FEEDBACK_EVENTS,
  FEEDBACK_REMINDER_MS,
  REVIEW_REPORT_REASON_LABELS,
  type ReviewReportReasonValue,
  type SellerReviewRow,
  type ModerationActionValue,
} from "@/lib/seller-reviews";
import { trackServerEvent } from "@/lib/starter-pack";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function starLinksHtml(appUrl: string, transactionId: string): string {
  const parts = [1, 2, 3, 4, 5].map((n) => {
    const href = `${appUrl}${feedbackUrl(transactionId)}?rating=${n}`;
    return `<a href="${href}" style="display:inline-block;margin:0 6px;padding:10px 12px;border:1px solid #49C184;border-radius:10px;color:#265C4B;text-decoration:none;font-weight:700">${n} ★</a>`;
  });
  return parts.join("");
}

async function sellerDisplayName(admin: SupabaseClient, sellerId: string): Promise<string> {
  const { data } = await admin.from("users").select("display_name").eq("id", sellerId).maybeSingle();
  return data?.display_name?.trim() || "your seller";
}

async function buyerDisplayName(admin: SupabaseClient, buyerId: string): Promise<string> {
  const { data } = await admin.from("users").select("display_name").eq("id", buyerId).maybeSingle();
  return data?.display_name?.trim() || "A buyer";
}

export async function requestSellerFeedback(
  admin: SupabaseClient,
  opts: { transactionId: string; listingId: string; buyerId: string; sellerId: string }
): Promise<void> {
  try {
    const [title, sellerName, { data: buyer }, { hero_image }] = await Promise.all([
      getListingTitle(admin, opts.listingId),
      sellerDisplayName(admin, opts.sellerId),
      admin.from("users").select("email").eq("id", opts.buyerId).maybeSingle(),
      getListingEmailContext(admin, opts.listingId),
    ]);

    await createNotification(admin, {
      userId: opts.buyerId,
      type: NotificationType.LEAVE_SELLER_FEEDBACK,
      title: "How was your purchase? ⭐",
      message: `Your ${title} has arrived. How was your experience with ${sellerName}?`,
      entityType: NotificationEntityType.TRANSACTION,
      entityId: opts.transactionId,
      actionUrl: feedbackUrl(opts.transactionId),
      actionLabel: "Leave feedback",
      requiresAction: true,
    });

    const appUrl = getAppUrl();
    if (buyer?.email) {
      const sent = await ensureEmailSent(admin, {
        emailType: EmailTriggerType.REVIEW_REQUEST,
        referenceId: opts.transactionId,
        recipientId: opts.buyerId,
        to: buyer.email,
        subject: "\u2B50 How did your Teevo purchase go?",
        type: "transactional",
        variables: {
          title: "How did your purchase go?",
          subtitle: `Your ${escapeHtml(title)} has arrived.`,
          body: [
            `How was your experience buying from <strong>${escapeHtml(sellerName)}</strong>?`,
            `<br /><br />`,
            `<span style="display:block;font-weight:700;margin-bottom:10px">Quick rating</span>`,
            starLinksHtml(appUrl, opts.transactionId),
          ].join(""),
          order_number: opts.transactionId.slice(0, 8),
          item_name: title,
          hero_image,
          cta_link: `${appUrl}${feedbackUrl(opts.transactionId)}`,
          cta_text: "Leave written feedback",
        },
      }).catch((e) => {
        console.error("review_request email failed", e);
        return false;
      });
      if (sent) {
        await trackServerEvent(admin, FEEDBACK_EVENTS.REQUEST_SENT, {
          userId: opts.buyerId,
          properties: { transaction_id: opts.transactionId, seller_id: opts.sellerId },
        });
      }
    }
  } catch (e) {
    console.error("requestSellerFeedback failed", e);
  }
}

export async function notifySellerNewFeedback(
  admin: SupabaseClient,
  review: SellerReviewRow
): Promise<void> {
  try {
    const title = review.listing_title_snapshot || (await getListingTitle(admin, review.listing_id));
    await createNotification(admin, {
      userId: review.seller_id,
      type: NotificationType.NEW_SELLER_FEEDBACK,
      title: "You received new feedback ⭐",
      message: `A buyer rated their purchase of your ${title} ${review.rating} star${review.rating === 1 ? "" : "s"}.`,
      entityType: NotificationEntityType.TRANSACTION,
      entityId: review.transaction_id,
      actionUrl: sellerUrl(review.seller_id, review.id),
      actionLabel: "View feedback",
      requiresAction: false,
      metadata: { review_id: review.id, rating: review.rating },
    });
  } catch (e) {
    console.error("notifySellerNewFeedback failed", e);
  }
}

export async function resolveBuyerFeedbackRequest(
  admin: SupabaseClient,
  opts: { transactionId: string; buyerId: string }
): Promise<void> {
  try {
    await resolveNotifications(admin, {
      types: [NotificationType.LEAVE_SELLER_FEEDBACK],
      entityId: opts.transactionId,
      userId: opts.buyerId,
    });
  } catch (e) {
    console.error("resolveBuyerFeedbackRequest failed", e);
  }
}

export async function notifyAdminFeedbackRequiresReview(
  admin: SupabaseClient,
  opts: {
    review: SellerReviewRow;
    reason: ReviewReportReasonValue;
    reporterId?: string | null;
  }
): Promise<void> {
  try {
    const [sellerName, buyerName] = await Promise.all([
      sellerDisplayName(admin, opts.review.seller_id),
      buyerDisplayName(admin, opts.review.buyer_id),
    ]);
    const reasonLabel = REVIEW_REPORT_REASON_LABELS[opts.reason];
    const product = opts.review.listing_title_snapshot || "a listing";

    const created = await notifyAdmins(admin, {
      type: NotificationType.FEEDBACK_REQUIRES_REVIEW,
      title: "Feedback requires review ⚠️",
      message: `A review for ${sellerName} has been reported and requires moderation.`,
      entityType: NotificationEntityType.REVIEW,
      entityId: opts.review.id,
      actionUrl: adminFeedbackUrl(opts.review.id),
      actionLabel: "Review feedback",
      requiresAction: true,
      metadata: {
        review_id: opts.review.id,
        seller_id: opts.review.seller_id,
        reason: opts.reason,
      },
    });
    if (created > 0) {
      await trackServerEvent(admin, FEEDBACK_EVENTS.ADMIN_NOTIFICATION_SENT, {
        properties: { review_id: opts.review.id, reason: opts.reason },
      });
    }

    const to = getAdminAlertEmail();
    if (!to) return;
    const appUrl = getAppUrl();
    const stars = "★".repeat(opts.review.rating) + "☆".repeat(5 - opts.review.rating);
    const sent = await ensureEmailSent(admin, {
      emailType: EmailTriggerType.FEEDBACK_REQUIRES_REVIEW_ADMIN,
      referenceId: opts.review.id,
      referenceType: "review",
      recipientId: null,
      to,
      subject: "\uD83D\uDEA8 Feedback report needs a look",
      type: "alert",
      variables: {
        title: "Feedback report needs a look",
        subtitle: "A review has been reported and requires your attention.",
        body: [
          `Seller: ${sellerName}`,
          `Buyer: ${buyerName}`,
          `Rating: ${stars}`,
          `Reason reported: ${reasonLabel}`,
          `Product: ${product}`,
        ].join("<br />"),
        cta_link: `${appUrl}${adminFeedbackUrl(opts.review.id)}`,
        cta_text: "Review feedback",
      },
    }).catch((e) => {
      console.error("feedback_requires_review_admin email failed", e);
      return false;
    });
    if (sent) {
      await trackServerEvent(admin, FEEDBACK_EVENTS.ADMIN_EMAIL_SENT, {
        properties: { review_id: opts.review.id, reason: opts.reason },
      });
    }
  } catch (e) {
    console.error("notifyAdminFeedbackRequiresReview failed", e);
  }
}

export async function resolveAdminFeedbackNotifications(
  admin: SupabaseClient,
  reviewId: string
): Promise<void> {
  try {
    await resolveNotifications(admin, {
      types: [NotificationType.FEEDBACK_REQUIRES_REVIEW],
      entityId: reviewId,
    });
    await clearSentEmail(admin, EmailTriggerType.FEEDBACK_REQUIRES_REVIEW_ADMIN, reviewId);
  } catch (e) {
    console.error("resolveAdminFeedbackNotifications failed", e);
  }
}

export async function trackFeedbackModerated(
  admin: SupabaseClient,
  opts: { adminId: string; reviewId: string; action: ModerationActionValue }
): Promise<void> {
  const name =
    opts.action === "hide"
      ? FEEDBACK_EVENTS.HIDDEN
      : opts.action === "restore"
        ? FEEDBACK_EVENTS.RESTORED
        : opts.action === "remove"
          ? FEEDBACK_EVENTS.REMOVED
          : FEEDBACK_EVENTS.MODERATED;
  await trackServerEvent(admin, FEEDBACK_EVENTS.MODERATED, {
    userId: opts.adminId,
    properties: { review_id: opts.reviewId, action: opts.action },
  });
  if (name !== FEEDBACK_EVENTS.MODERATED) {
    await trackServerEvent(admin, name, {
      userId: opts.adminId,
      properties: { review_id: opts.reviewId },
    });
  }
}

export async function sendSellerFeedbackReminders(
  admin: SupabaseClient
): Promise<number> {
  const cutoff = new Date(Date.now() - FEEDBACK_REMINDER_MS).toISOString();
  const { data: txs } = await admin
    .from("transactions")
    .select("id, listing_id, buyer_id, seller_id, buyer_confirmed_at")
    .eq("status", "complete")
    .not("buyer_confirmed_at", "is", null)
    .lte("buyer_confirmed_at", cutoff)
    .limit(80);

  let sent = 0;
  for (const tx of txs ?? []) {
    const { data: existing } = await admin
      .from("seller_reviews")
      .select("id")
      .eq("transaction_id", tx.id)
      .maybeSingle();
    if (existing) continue;

    const { data: already } = await admin
      .from("sent_emails")
      .select("id")
      .eq("email_type", EmailTriggerType.REVIEW_REQUEST_REMINDER)
      .eq("reference_id", tx.id)
      .maybeSingle();
    if (already) continue;

    const { data: buyer } = await admin.from("users").select("email").eq("id", tx.buyer_id).maybeSingle();
    if (!buyer?.email) continue;

    const [title, sellerName, { hero_image }] = await Promise.all([
      getListingTitle(admin, tx.listing_id),
      sellerDisplayName(admin, tx.seller_id),
      getListingEmailContext(admin, tx.listing_id),
    ]);
    const appUrl = getAppUrl();
    const ok = await ensureEmailSent(admin, {
      emailType: EmailTriggerType.REVIEW_REQUEST_REMINDER,
      referenceId: tx.id,
      recipientId: tx.buyer_id,
      to: buyer.email,
      subject: "\u2B50 Got 30 seconds? Rate your Teevo purchase",
      type: "transactional",
      variables: {
        title: "Still time to leave your review",
        subtitle: `Your ${escapeHtml(title)} has arrived.`,
        body: [
          `How was your experience buying from <strong>${escapeHtml(sellerName)}</strong>? It only takes a moment.`,
          `<br /><br />`,
          `<span style="display:block;font-weight:700;margin-bottom:10px">Quick rating</span>`,
          starLinksHtml(appUrl, tx.id),
        ].join(""),
        order_number: tx.id.slice(0, 8),
        item_name: title,
        hero_image,
        cta_link: `${appUrl}${feedbackUrl(tx.id)}`,
        cta_text: "Leave written feedback",
      },
    }).catch((e) => {
      console.error("review_request_reminder email failed", e);
      return false;
    });
    if (ok) {
      sent += 1;
      await trackServerEvent(admin, FEEDBACK_EVENTS.REMINDER_SENT, {
        userId: tx.buyer_id,
        properties: { transaction_id: tx.id },
      });
    }
  }
  return sent;
}
