/**
 * In-app + email notifications for dispatch deadlines, extensions, and timeout cancellation.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDispatchDeadline } from "@/lib/business-days";
import { ensureEmailSent, EmailTriggerType, getListingEmailContext } from "@/lib/email-triggers";
import { getAppUrl } from "@/lib/app-env";
import { getAdminAlertEmail } from "@/lib/fulfilment-emails";
import {
  NotificationType,
  adminTransactionUrl,
  createNotification,
  getListingTitle,
  notifyAdmins,
  purchasesUrl,
  resolveNotifications,
  salesUrl,
} from "@/lib/notifications";

const appUrl = getAppUrl();

async function userEmail(admin: SupabaseClient, userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null;
  const { data } = await admin.from("users").select("email").eq("id", userId).maybeSingle();
  return data?.email ?? null;
}

export async function notifyDispatchReminder(
  admin: SupabaseClient,
  opts: {
    transactionId: string;
    listingId: string;
    sellerId: string;
    deadlineIso: string;
    stage: "after_purchase" | "one_day" | "final";
  }
): Promise<void> {
  try {
    const title = await getListingTitle(admin, opts.listingId);
    const dateLabel = formatDispatchDeadline(opts.deadlineIso);
    const { itemName, hero_image } = await getListingEmailContext(admin, opts.listingId);
    const to = await userEmail(admin, opts.sellerId);
    const salesLink = `${appUrl}${salesUrl(opts.transactionId)}`;
    const orderShort = opts.transactionId.slice(0, 8);

    if (opts.stage === "after_purchase") {
      await createNotification(admin, {
        userId: opts.sellerId,
        type: NotificationType.DISPATCH_REMINDER,
        title: `Remember to ship your ${title}`,
        message: `Your buyer is waiting. Please dispatch your order by ${dateLabel}.`,
        entityId: opts.transactionId,
        actionUrl: salesUrl(opts.transactionId),
        actionLabel: "View shipping",
        requiresAction: true,
      });
      if (to) {
        await ensureEmailSent(admin, {
          emailType: EmailTriggerType.DISPATCH_REMINDER,
          referenceId: `${opts.transactionId}:dispatch_reminder_after_purchase`,
          recipientId: opts.sellerId,
          to,
          subject: `\uD83D\uDCE6 Don\u2019t forget to ship your ${itemName}`,
          type: "transactional",
          variables: {
            title: `Don\u2019t forget to ship your ${itemName}`,
            subtitle: `Your buyer is waiting. Please dispatch your order by ${dateLabel}.`,
            body: `Pack up your club and get it dispatched by <strong>${dateLabel}</strong>. Head to your Sales dashboard to complete the shipping steps.`,
            order_number: orderShort,
            item_name: itemName,
            hero_image,
            cta_link: salesLink,
            cta_text: "View shipping",
          },
        }).catch((e) => console.error("dispatch reminder email failed", e));
      }
      return;
    }

    if (opts.stage === "one_day") {
      await createNotification(admin, {
        userId: opts.sellerId,
        type: NotificationType.DISPATCH_ONE_DAY_LEFT,
        title: "1 day left to ship your order",
        message: `Please dispatch ${title} by ${dateLabel} to prevent the order being cancelled.`,
        entityId: opts.transactionId,
        actionUrl: salesUrl(opts.transactionId),
        actionLabel: "Ship order",
        requiresAction: true,
      });
      if (to) {
        await ensureEmailSent(admin, {
          emailType: EmailTriggerType.DISPATCH_ONE_DAY_LEFT,
          referenceId: `${opts.transactionId}:dispatch_reminder_one_day`,
          recipientId: opts.sellerId,
          to,
          subject: `\u23F0 1 day left to ship your ${itemName}`,
          type: "transactional",
          variables: {
            title: `1 day left to ship your ${itemName}`,
            subtitle: `Please dispatch by ${dateLabel} to avoid the order being cancelled.`,
            body: `This is your last chance to get your club dispatched on time. If you need a little longer, you can request an extension from your Sales page.`,
            order_number: orderShort,
            item_name: itemName,
            hero_image,
            cta_link: salesLink,
            cta_text: "Ship order",
          },
        }).catch((e) => console.error("dispatch one-day email failed", e));
      }
      return;
    }

    await createNotification(admin, {
      userId: opts.sellerId,
      type: NotificationType.DISPATCH_REQUIRED_TODAY,
      title: "Dispatch required today",
      message: `Your ${title} must be dispatched today. If it isn't dispatched by the deadline, the order will be cancelled and the buyer refunded.`,
      entityId: opts.transactionId,
      actionUrl: salesUrl(opts.transactionId),
      actionLabel: "Ship order",
      requiresAction: true,
    });
    if (to) {
      await ensureEmailSent(admin, {
        emailType: EmailTriggerType.DISPATCH_REQUIRED_TODAY,
        referenceId: `${opts.transactionId}:dispatch_reminder_final`,
        recipientId: opts.sellerId,
        to,
        subject: `\uD83D\uDEA8 Your ${itemName} needs shipping today`,
        type: "transactional",
        variables: {
          title: `Your ${itemName} needs shipping today`,
          subtitle: `Today is the last day to dispatch this order.`,
          body: `If it isn\u2019t dispatched by ${dateLabel}, the order will be cancelled and the buyer refunded. Please complete the shipping steps in your Sales dashboard now.`,
          order_number: orderShort,
          item_name: itemName,
          hero_image,
          cta_link: salesLink,
          cta_text: "Ship order",
        },
      }).catch((e) => console.error("dispatch final-day email failed", e));
    }
  } catch (e) {
    console.error("notifyDispatchReminder failed", e);
  }
}

export async function notifyDispatchExtensionRequested(
  admin: SupabaseClient,
  opts: {
    transactionId: string;
    listingId: string;
    buyerId: string;
    extraBusinessDays: number;
  }
): Promise<void> {
  try {
    const title = await getListingTitle(admin, opts.listingId);
    const { itemName, hero_image } = await getListingEmailContext(admin, opts.listingId);
    const to = await userEmail(admin, opts.buyerId);
    const reviewLink = `${appUrl}${purchasesUrl(opts.transactionId)}`;
    await createNotification(admin, {
      userId: opts.buyerId,
      type: NotificationType.DISPATCH_EXTENSION_REQUESTED,
      title: "Seller needs more time",
      message: `The seller of your ${title} has requested an additional ${opts.extraBusinessDays} days to dispatch your order.`,
      entityId: opts.transactionId,
      actionUrl: purchasesUrl(opts.transactionId),
      actionLabel: "Review request",
      requiresAction: true,
    });
    if (to) {
      await ensureEmailSent(admin, {
        emailType: EmailTriggerType.DISPATCH_EXTENSION_REQUESTED,
        referenceId: `${opts.transactionId}:dispatch_extension_requested`,
        recipientId: opts.buyerId,
        to,
        subject: "\u23F3 Your seller needs a little more time",
        type: "transactional",
        variables: {
          title: "Your seller needs a little more time",
          subtitle: `The seller has asked for an additional ${opts.extraBusinessDays} business day${opts.extraBusinessDays === 1 ? "" : "s"} to dispatch your ${itemName}.`,
          body: `You can allow the extra time or keep the original dispatch date. Head to your Purchases dashboard to review the request.`,
          order_number: opts.transactionId.slice(0, 8),
          item_name: itemName,
          hero_image,
          cta_link: reviewLink,
          cta_text: "Review request",
        },
      }).catch((e) => console.error("extension requested email failed", e));
    }
  } catch (e) {
    console.error("notifyDispatchExtensionRequested failed", e);
  }
}

export async function notifyDispatchExtensionDecision(
  admin: SupabaseClient,
  opts: {
    transactionId: string;
    listingId: string;
    sellerId: string;
    buyerId: string;
    approved: boolean;
    deadlineIso: string;
  }
): Promise<void> {
  try {
    await resolveNotifications(admin, {
      types: [NotificationType.DISPATCH_EXTENSION_REQUESTED],
      entityId: opts.transactionId,
      userId: opts.buyerId,
    });
    const title = await getListingTitle(admin, opts.listingId);
    const dateLabel = formatDispatchDeadline(opts.deadlineIso);
    const { itemName, hero_image } = await getListingEmailContext(admin, opts.listingId);
    const to = await userEmail(admin, opts.sellerId);
    const salesLink = `${appUrl}${salesUrl(opts.transactionId)}`;
    if (opts.approved) {
      await createNotification(admin, {
        userId: opts.sellerId,
        type: NotificationType.DISPATCH_EXTENSION_APPROVED,
        title: "Your extension was approved",
        message: `Please dispatch ${title} by ${dateLabel}.`,
        entityId: opts.transactionId,
        actionUrl: salesUrl(opts.transactionId),
        actionLabel: "View order",
        requiresAction: true,
      });
      if (to) {
        await ensureEmailSent(admin, {
          emailType: EmailTriggerType.DISPATCH_EXTENSION_APPROVED,
          referenceId: `${opts.transactionId}:dispatch_extension_approved`,
          recipientId: opts.sellerId,
          to,
          subject: `\uD83D\uDC4D More time approved \u2014 ship by ${dateLabel}`,
          type: "transactional",
          variables: {
            title: "More time approved",
            subtitle: `The buyer has given you extra time. Please dispatch by ${dateLabel}.`,
            body: `Your extension was approved. Ship your ${itemName} by <strong>${dateLabel}</strong> to avoid the order being cancelled.`,
            order_number: opts.transactionId.slice(0, 8),
            item_name: itemName,
            hero_image,
            cta_link: salesLink,
            cta_text: "View order",
          },
        }).catch((e) => console.error("extension approved email failed", e));
      }
    } else {
      await createNotification(admin, {
        userId: opts.sellerId,
        type: NotificationType.DISPATCH_EXTENSION_DECLINED,
        title: "Your extension wasn't approved",
        message: `Please dispatch your order by ${dateLabel}.`,
        entityId: opts.transactionId,
        actionUrl: salesUrl(opts.transactionId),
        actionLabel: "View order",
        requiresAction: true,
      });
      if (to) {
        await ensureEmailSent(admin, {
          emailType: EmailTriggerType.DISPATCH_EXTENSION_DECLINED,
          referenceId: `${opts.transactionId}:dispatch_extension_declined`,
          recipientId: opts.sellerId,
          to,
          subject: `\u23F0 Your shipping extension wasn\u2019t approved`,
          type: "transactional",
          variables: {
            title: "Your extension wasn\u2019t approved",
            subtitle: `The original dispatch deadline still applies.`,
            body: `Please dispatch your ${itemName} by <strong>${dateLabel}</strong>. If the order isn\u2019t dispatched in time, it may be cancelled and the buyer refunded.`,
            order_number: opts.transactionId.slice(0, 8),
            item_name: itemName,
            hero_image,
            cta_link: salesLink,
            cta_text: "View order",
          },
        }).catch((e) => console.error("extension declined email failed", e));
      }
    }
  } catch (e) {
    console.error("notifyDispatchExtensionDecision failed", e);
  }
}

export async function notifyDispatchTimeoutCancelled(
  admin: SupabaseClient,
  opts: {
    transactionId: string;
    listingId: string;
    sellerId: string;
    buyerId: string;
  }
): Promise<void> {
  try {
    await resolveNotifications(admin, {
      types: [
        NotificationType.ITEM_SOLD,
        NotificationType.DISPATCH_REMINDER,
        NotificationType.DISPATCH_ONE_DAY_LEFT,
        NotificationType.DISPATCH_REQUIRED_TODAY,
        NotificationType.DISPATCH_EXTENSION_APPROVED,
        NotificationType.DISPATCH_EXTENSION_DECLINED,
        NotificationType.DISPATCH_EXTENSION_REQUESTED,
        NotificationType.READY_TO_SHIP,
        NotificationType.SHIPPING_LABEL_READY,
        NotificationType.PACKAGING_APPROVED,
        NotificationType.PACKAGING_REJECTED,
      ],
      entityId: opts.transactionId,
    });

    const title = await getListingTitle(admin, opts.listingId);
    const { itemName, hero_image } = await getListingEmailContext(admin, opts.listingId);
    const buyerTo = await userEmail(admin, opts.buyerId);
    const sellerTo = await userEmail(admin, opts.sellerId);
    const orderShort = opts.transactionId.slice(0, 8);
    const purchaseLink = `${appUrl}${purchasesUrl(opts.transactionId)}`;
    const salesLink = `${appUrl}${salesUrl(opts.transactionId)}`;

    await createNotification(admin, {
      userId: opts.buyerId,
      type: NotificationType.ORDER_CANCELLED_SELLER_TIMEOUT,
      title: "Your order has been cancelled",
      message: `The seller didn't dispatch your ${title} within the required timeframe. We've cancelled the order and issued you a full refund.`,
      entityId: opts.transactionId,
      actionUrl: purchasesUrl(opts.transactionId),
      actionLabel: "View order",
      requiresAction: false,
    });
    await createNotification(admin, {
      userId: opts.sellerId,
      type: NotificationType.ORDER_CANCELLED_DISPATCH_TIMEOUT,
      title: "Order cancelled",
      message: `Your ${title} wasn't dispatched by the deadline, so the order has been cancelled and the buyer refunded.`,
      entityId: opts.transactionId,
      actionUrl: salesUrl(opts.transactionId),
      actionLabel: "View order",
      requiresAction: false,
    });
    await createNotification(admin, {
      userId: opts.sellerId,
      type: NotificationType.CONFIRM_LISTING_AVAILABILITY,
      title: `Is your ${title} still available?`,
      message: "Your previous sale was cancelled because the item wasn't dispatched. Let us know whether you'd still like to sell it on Teevo.",
      entityId: opts.transactionId,
      actionUrl: salesUrl(opts.transactionId),
      actionLabel: "Confirm item availability",
      requiresAction: true,
    });

    if (buyerTo) {
      await ensureEmailSent(admin, {
        emailType: EmailTriggerType.ORDER_CANCELLED_SELLER_TIMEOUT_BUYER,
        referenceId: `${opts.transactionId}:order_cancelled_buyer`,
        recipientId: opts.buyerId,
        to: buyerTo,
        subject: "\uD83D\uDE15 Your Teevo order has been cancelled",
        type: "transactional",
        variables: {
          title: "Your order has been cancelled",
          subtitle: `Unfortunately, the seller wasn\u2019t able to dispatch your ${itemName} in time.`,
          body: `We\u2019ve cancelled the order and issued you a full refund. The refund will appear according to your payment provider\u2019s usual timing.`,
          order_number: orderShort,
          item_name: itemName,
          hero_image,
          cta_link: purchaseLink,
          cta_text: "View order",
        },
      }).catch((e) => console.error("buyer cancel email failed", e));
    }
    if (sellerTo) {
      await ensureEmailSent(admin, {
        emailType: EmailTriggerType.ORDER_CANCELLED_DISPATCH_TIMEOUT_SELLER,
        referenceId: `${opts.transactionId}:order_cancelled_seller`,
        recipientId: opts.sellerId,
        to: sellerTo,
        subject: "\uD83D\uDE15 Your Teevo sale has been cancelled",
        type: "transactional",
        variables: {
          title: "Your sale has been cancelled",
          subtitle: `Your ${itemName} wasn\u2019t dispatched by the deadline.`,
          body: `The buyer has been refunded. Your listing will not automatically return to the marketplace \u2014 please confirm whether the item is still available if you\u2019d like to relist it.`,
          order_number: orderShort,
          item_name: itemName,
          hero_image,
          cta_link: salesLink,
          cta_text: "Confirm item availability",
        },
      }).catch((e) => console.error("seller cancel email failed", e));
    }
  } catch (e) {
    console.error("notifyDispatchTimeoutCancelled failed", e);
  }
}

export async function notifyDispatchCancellationFailed(
  admin: SupabaseClient,
  opts: {
    transactionId: string;
    listingId?: string | null;
    detail: string;
  }
): Promise<void> {
  try {
    const title = await getListingTitle(admin, opts.listingId);
    await notifyAdmins(admin, {
      type: NotificationType.DISPATCH_CANCELLATION_FAILED,
      title: "Order requires attention",
      message: `Automatic cancellation/refund failed for ${title} (order #${opts.transactionId.slice(0, 8)}). ${opts.detail}`,
      entityId: opts.transactionId,
      actionUrl: adminTransactionUrl(opts.transactionId),
      actionLabel: "Review order",
      requiresAction: true,
    });
    await notifyAdmins(admin, {
      type: NotificationType.REFUND_REQUIRES_ACTION,
      title: "Refund requires action",
      message: `A dispatch-timeout refund needs attention for ${title}.`,
      entityId: opts.transactionId,
      actionUrl: adminTransactionUrl(opts.transactionId),
      actionLabel: "Review order",
      requiresAction: true,
    });
    const to = getAdminAlertEmail();
    if (to) {
      await ensureEmailSent(admin, {
        emailType: EmailTriggerType.DISPATCH_CANCELLATION_FAILED_ADMIN,
        referenceId: `${opts.transactionId}:dispatch_cancellation_failed`,
        to,
        subject: `\uD83D\uDEA8 Order #${opts.transactionId.slice(0, 8)} needs attention`,
        type: "alert",
        variables: {
          title: `Order #${opts.transactionId.slice(0, 8)} needs attention`,
          subtitle: `Automatic cancellation/refund failed for order #${opts.transactionId.slice(0, 8)}.`,
          body: opts.detail,
          hero_image: "",
          cta_link: `${appUrl}${adminTransactionUrl(opts.transactionId)}`,
          cta_text: "Review order",
        },
      }).catch((e) => console.error("admin cancel-failed email failed", e));
    }
  } catch (e) {
    console.error("notifyDispatchCancellationFailed failed", e);
  }
}

export async function resolveListingAvailabilityNotification(
  admin: SupabaseClient,
  transactionId: string
): Promise<void> {
  await resolveNotifications(admin, {
    types: [NotificationType.CONFIRM_LISTING_AVAILABILITY],
    entityId: transactionId,
  });
}
