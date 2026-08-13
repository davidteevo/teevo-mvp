/**
 * Domain event → in-app notification. Call next to existing email sends.
 * Never throws.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { FulfilmentMode } from "@/lib/fulfilment-providers";
import {
  NotificationType,
  NotificationEntityType,
  adminFulfilmentUrl,
  adminListingUrl,
  adminPackagingUrl,
  adminStarterPackUrl,
  adminTransactionUrl,
  confirmDeliveryUrl,
  createNotification,
  getListingTitle,
  notifyAdmins,
  purchasesUrl,
  resolveNotifications,
  salesUrl,
} from "@/lib/notifications";

type TxIds = {
  transactionId: string;
  listingId?: string | null;
  buyerId?: string | null;
  sellerId?: string | null;
};

async function titleFor(admin: SupabaseClient, listingId?: string | null): Promise<string> {
  return getListingTitle(admin, listingId);
}

export async function notifyCheckoutComplete(
  admin: SupabaseClient,
  opts: TxIds & { sellerId: string; buyerId: string }
): Promise<void> {
  try {
    const title = await titleFor(admin, opts.listingId);
    await createNotification(admin, {
      userId: opts.buyerId,
      type: NotificationType.ORDER_CONFIRMED,
      title: "Order confirmed 🎉",
      message: `You've purchased ${title}.`,
      entityId: opts.transactionId,
      actionUrl: purchasesUrl(opts.transactionId),
      actionLabel: "View purchase",
      requiresAction: false,
    });
    await createNotification(admin, {
      userId: opts.sellerId,
      type: NotificationType.ITEM_SOLD,
      title: "Your club sold 🎉",
      message: `Your ${title} has sold. Complete the next steps to prepare it for shipping.`,
      entityId: opts.transactionId,
      actionUrl: salesUrl(opts.transactionId),
      actionLabel: "Start shipping",
      requiresAction: true,
    });
  } catch (e) {
    console.error("notifyCheckoutComplete failed", e);
  }
}

export async function notifyPackagingPhotosSubmitted(
  admin: SupabaseClient,
  opts: TxIds & { sellerId: string; wasRejected: boolean }
): Promise<void> {
  try {
    const title = await titleFor(admin, opts.listingId);
    await resolveNotifications(admin, {
      types: [NotificationType.ITEM_SOLD, NotificationType.PACKAGING_REJECTED],
      entityId: opts.transactionId,
      userId: opts.sellerId,
    });
    if (opts.wasRejected) {
      await resolveNotifications(admin, {
        types: [NotificationType.PACKAGING_REVIEW_REQUIRED],
        entityId: opts.transactionId,
      });
      await notifyAdmins(admin, {
        type: NotificationType.PACKAGING_RESUBMITTED,
        title: "Packaging resubmitted for review",
        message: `Packaging for ${title} was resubmitted after rejection.`,
        entityId: opts.transactionId,
        actionUrl: adminPackagingUrl(opts.transactionId),
        actionLabel: "Review packaging",
        requiresAction: true,
      });
    } else {
      await notifyAdmins(admin, {
        type: NotificationType.PACKAGING_REVIEW_REQUIRED,
        title: "Packaging review required",
        message: `A seller has submitted packaging for ${title}.`,
        entityId: opts.transactionId,
        actionUrl: adminPackagingUrl(opts.transactionId),
        actionLabel: "Review packaging",
        requiresAction: true,
      });
    }
  } catch (e) {
    console.error("notifyPackagingPhotosSubmitted failed", e);
  }
}

export async function notifyStarterPackRequested(
  admin: SupabaseClient,
  opts: TxIds & { sellerId: string }
): Promise<void> {
  try {
    const title = await titleFor(admin, opts.listingId);
    await resolveNotifications(admin, {
      types: [NotificationType.ITEM_SOLD],
      entityId: opts.transactionId,
      userId: opts.sellerId,
    });
    await createNotification(admin, {
      userId: opts.sellerId,
      type: NotificationType.STARTER_PACK_REQUESTED,
      title: "Starter pack requested",
      message: "We're preparing your free Teevo starter pack.",
      entityId: opts.transactionId,
      actionUrl: salesUrl(opts.transactionId),
      actionLabel: "View sale",
      requiresAction: false,
    });
    await notifyAdmins(admin, {
      type: NotificationType.STARTER_PACK_REQUIRES_SHIPPING,
      title: "Starter pack requires shipping",
      message: `A starter pack needs to be sent for ${title}.`,
      entityId: opts.transactionId,
      actionUrl: adminStarterPackUrl(opts.transactionId),
      actionLabel: "View starter pack request",
      requiresAction: true,
    });
  } catch (e) {
    console.error("notifyStarterPackRequested failed", e);
  }
}

export async function notifyStarterPackDispatched(
  admin: SupabaseClient,
  opts: { transactionId: string }
): Promise<void> {
  try {
    await resolveNotifications(admin, {
      types: [NotificationType.STARTER_PACK_REQUIRES_SHIPPING],
      entityId: opts.transactionId,
    });
  } catch (e) {
    console.error("notifyStarterPackDispatched failed", e);
  }
}

export async function notifyPackagingApproved(
  admin: SupabaseClient,
  opts: TxIds & { sellerId: string; fulfilmentMode?: string | null }
): Promise<void> {
  try {
    const title = await titleFor(admin, opts.listingId);
    await resolveNotifications(admin, {
      types: [
        NotificationType.PACKAGING_REVIEW_REQUIRED,
        NotificationType.PACKAGING_RESUBMITTED,
        NotificationType.PACKAGING_REJECTED,
      ],
      entityId: opts.transactionId,
    });
    const isManual = opts.fulfilmentMode === FulfilmentMode.MANUAL;
    await createNotification(admin, {
      userId: opts.sellerId,
      type: NotificationType.PACKAGING_APPROVED,
      title: "Packaging approved",
      message: `Your packaging for ${title} has been approved.`,
      entityId: opts.transactionId,
      actionUrl: salesUrl(opts.transactionId),
      actionLabel: isManual ? "View shipping status" : "Generate shipping label",
      requiresAction: !isManual,
    });
    if (isManual) {
      await notifyAdmins(admin, {
        type: NotificationType.SHIPPING_LABEL_REQUIRED,
        title: "Shipping label required",
        message: `Create a shipping label for ${title}.`,
        entityId: opts.transactionId,
        actionUrl: adminFulfilmentUrl(opts.transactionId),
        actionLabel: "Create shipping label",
        requiresAction: true,
      });
    }
  } catch (e) {
    console.error("notifyPackagingApproved failed", e);
  }
}

export async function notifyPackagingRejected(
  admin: SupabaseClient,
  opts: TxIds & { sellerId: string }
): Promise<void> {
  try {
    const title = await titleFor(admin, opts.listingId);
    await resolveNotifications(admin, {
      types: [
        NotificationType.PACKAGING_REVIEW_REQUIRED,
        NotificationType.PACKAGING_RESUBMITTED,
      ],
      entityId: opts.transactionId,
    });
    await createNotification(admin, {
      userId: opts.sellerId,
      type: NotificationType.PACKAGING_REJECTED,
      title: "Packaging needs updating",
      message: `We couldn't approve the packaging for ${title}. Review the feedback and submit it again.`,
      entityId: opts.transactionId,
      actionUrl: salesUrl(opts.transactionId),
      actionLabel: "Update packaging",
      requiresAction: true,
    });
  } catch (e) {
    console.error("notifyPackagingRejected failed", e);
  }
}

export async function notifyShippoLabelCreated(
  admin: SupabaseClient,
  opts: TxIds & { sellerId: string }
): Promise<void> {
  try {
    const title = await titleFor(admin, opts.listingId);
    await resolveNotifications(admin, {
      types: [NotificationType.PACKAGING_APPROVED, NotificationType.SHIPPING_LABEL_ISSUE],
      entityId: opts.transactionId,
    });
    await createNotification(admin, {
      userId: opts.sellerId,
      type: NotificationType.READY_TO_SHIP,
      title: "Ready to ship",
      message: `Everything is ready. Send ${title} to the buyer.`,
      entityId: opts.transactionId,
      actionUrl: salesUrl(opts.transactionId),
      actionLabel: "View shipping instructions",
      requiresAction: true,
    });
  } catch (e) {
    console.error("notifyShippoLabelCreated failed", e);
  }
}

export async function notifyShippoLabelFailed(
  admin: SupabaseClient,
  opts: TxIds & { errorMessage?: string }
): Promise<void> {
  try {
    const title = await titleFor(admin, opts.listingId);
    await notifyAdmins(admin, {
      type: NotificationType.SHIPPING_LABEL_ISSUE,
      title: "Shipping label issue",
      message: `Label generation failed for ${title}.${opts.errorMessage ? ` ${opts.errorMessage}` : ""}`,
      entityId: opts.transactionId,
      actionUrl: adminFulfilmentUrl(opts.transactionId),
      actionLabel: "Resolve shipping issue",
      requiresAction: true,
      metadata: opts.errorMessage ? { error: opts.errorMessage } : {},
    });
  } catch (e) {
    console.error("notifyShippoLabelFailed failed", e);
  }
}

export async function notifyManualLabelReady(
  admin: SupabaseClient,
  opts: TxIds & { sellerId: string }
): Promise<void> {
  try {
    const title = await titleFor(admin, opts.listingId);
    await resolveNotifications(admin, {
      types: [
        NotificationType.SHIPPING_LABEL_REQUIRED,
        NotificationType.SHIPPING_LABEL_ISSUE,
        NotificationType.PACKAGING_APPROVED,
      ],
      entityId: opts.transactionId,
    });
    await createNotification(admin, {
      userId: opts.sellerId,
      type: NotificationType.SHIPPING_LABEL_READY,
      title: "Your shipping label is ready",
      message: `Your shipping label for ${title} is ready to use.`,
      entityId: opts.transactionId,
      actionUrl: salesUrl(opts.transactionId),
      actionLabel: "View shipping label",
      requiresAction: true,
    });
  } catch (e) {
    console.error("notifyManualLabelReady failed", e);
  }
}

export async function notifyItemDispatched(
  admin: SupabaseClient,
  opts: TxIds & { sellerId: string; buyerId: string; fulfilmentMode?: string | null }
): Promise<void> {
  try {
    const title = await titleFor(admin, opts.listingId);
    await resolveNotifications(admin, {
      types: [
        NotificationType.READY_TO_SHIP,
        NotificationType.SHIPPING_LABEL_READY,
        NotificationType.SELLER_NOT_DISPATCHED,
      ],
      entityId: opts.transactionId,
    });
    await createNotification(admin, {
      userId: opts.sellerId,
      type: NotificationType.ITEM_DISPATCHED,
      title: "Club dispatched",
      message: `${title} is on its way to the buyer.`,
      entityId: opts.transactionId,
      actionUrl: salesUrl(opts.transactionId),
      actionLabel: "Track shipment",
      requiresAction: false,
    });
    await createNotification(admin, {
      userId: opts.buyerId,
      type: NotificationType.SELLER_DISPATCHED,
      title: "Your club is on its way",
      message: `The seller has dispatched ${title}.`,
      entityId: opts.transactionId,
      actionUrl: purchasesUrl(opts.transactionId),
      actionLabel: "Track delivery",
      requiresAction: false,
    });
    if (opts.fulfilmentMode === FulfilmentMode.MANUAL) {
      await createNotification(admin, {
        userId: opts.buyerId,
        type: NotificationType.CONFIRM_DELIVERY,
        title: "Confirm your club has arrived",
        message: `Your ${title} has been dispatched. When it arrives, please confirm you've received it and everything is as expected.`,
        entityId: opts.transactionId,
        actionUrl: confirmDeliveryUrl(opts.transactionId),
        actionLabel: "Confirm delivery",
        requiresAction: true,
      });
    }
  } catch (e) {
    console.error("notifyItemDispatched failed", e);
  }
}

export async function notifyCarrierDelivered(
  admin: SupabaseClient,
  opts: TxIds & { sellerId: string; buyerId: string }
): Promise<void> {
  try {
    const title = await titleFor(admin, opts.listingId);
    await resolveNotifications(admin, {
      types: [
        NotificationType.DELIVERY_OVERDUE,
        NotificationType.TRACKING_ISSUE,
        NotificationType.SELLER_DISPATCHED,
      ],
      entityId: opts.transactionId,
    });
    await createNotification(admin, {
      userId: opts.buyerId,
      type: NotificationType.CONFIRM_DELIVERY,
      title: "Confirm your club has arrived",
      message: `Your ${title} has been delivered. Please confirm you've received it and everything is as expected.`,
      entityId: opts.transactionId,
      actionUrl: confirmDeliveryUrl(opts.transactionId),
      actionLabel: "Confirm delivery",
      requiresAction: true,
    });
    await createNotification(admin, {
      userId: opts.sellerId,
      type: NotificationType.ITEM_DELIVERED_AWAITING_CONFIRMATION,
      title: "Club delivered",
      message: `${title} has been delivered. We're waiting for the buyer to confirm everything is OK.`,
      entityId: opts.transactionId,
      actionUrl: salesUrl(opts.transactionId),
      actionLabel: "View sale",
      requiresAction: false,
    });
  } catch (e) {
    console.error("notifyCarrierDelivered failed", e);
  }
}

export async function notifyTrackingIssue(
  admin: SupabaseClient,
  opts: TxIds & { trackingStatus: string }
): Promise<void> {
  try {
    const title = await titleFor(admin, opts.listingId);
    await notifyAdmins(admin, {
      type: NotificationType.TRACKING_ISSUE,
      title: "Tracking issue",
      message: `Tracking for ${title} reported ${opts.trackingStatus.replace(/_/g, " ").toLowerCase()}.`,
      entityId: opts.transactionId,
      actionUrl: adminTransactionUrl(opts.transactionId),
      actionLabel: "Review tracking",
      requiresAction: true,
      metadata: { tracking_status: opts.trackingStatus },
    });
  } catch (e) {
    console.error("notifyTrackingIssue failed", e);
  }
}

export async function notifyBuyerConfirmedDelivery(
  admin: SupabaseClient,
  opts: TxIds & { sellerId: string; buyerId: string }
): Promise<void> {
  try {
    const title = await titleFor(admin, opts.listingId);
    await resolveNotifications(admin, {
      types: [
        NotificationType.CONFIRM_DELIVERY,
        NotificationType.BUYER_NOT_CONFIRMED,
        NotificationType.ITEM_DELIVERED_AWAITING_CONFIRMATION,
      ],
      entityId: opts.transactionId,
    });
    await createNotification(admin, {
      userId: opts.sellerId,
      type: NotificationType.BUYER_CONFIRMED_DELIVERY,
      title: "Buyer confirmed delivery 🎉",
      message: `The buyer has confirmed that ${title} arrived successfully. Your Teevo order is complete. Payouts continue via Stripe as normal.`,
      entityId: opts.transactionId,
      actionUrl: salesUrl(opts.transactionId),
      actionLabel: "View sale",
      requiresAction: false,
    });
  } catch (e) {
    console.error("notifyBuyerConfirmedDelivery failed", e);
  }
}

export async function notifyDeliveryIssueReported(
  admin: SupabaseClient,
  opts: TxIds
): Promise<void> {
  try {
    const title = await titleFor(admin, opts.listingId);
    await notifyAdmins(admin, {
      type: NotificationType.DELIVERY_ISSUE_REPORTED,
      title: "Delivery issue requires review",
      message: `The buyer reported a problem with ${title}.`,
      entityId: opts.transactionId,
      actionUrl: adminTransactionUrl(opts.transactionId),
      actionLabel: "Review issue",
      requiresAction: true,
    });
    await notifyAdmins(admin, {
      type: NotificationType.REFUND_REQUIRES_ACTION,
      title: "Refund requires action",
      message: `A refund may be required for ${title} after a buyer-reported delivery issue.`,
      entityId: opts.transactionId,
      actionUrl: adminTransactionUrl(opts.transactionId),
      actionLabel: "Review refund",
      requiresAction: true,
    });
  } catch (e) {
    console.error("notifyDeliveryIssueReported failed", e);
  }
}

export async function notifyFundsReleaseRequiresAction(
  admin: SupabaseClient,
  opts: TxIds & { reason: string }
): Promise<void> {
  try {
    const title = await titleFor(admin, opts.listingId);
    await notifyAdmins(admin, {
      type: NotificationType.FUNDS_RELEASE_REQUIRES_ACTION,
      title: "Funds release requires action",
      message: `Buyer confirmation for ${title} needs admin attention. ${opts.reason}`,
      entityId: opts.transactionId,
      actionUrl: adminTransactionUrl(opts.transactionId),
      actionLabel: "Review payout",
      requiresAction: true,
      metadata: { reason: opts.reason },
    });
  } catch (e) {
    console.error("notifyFundsReleaseRequiresAction failed", e);
  }
}

export async function notifyPaymentIssue(
  admin: SupabaseClient,
  opts: { transactionId: string; listingId?: string | null; kind: "dispute" | "refund_failed" }
): Promise<void> {
  try {
    const title = await titleFor(admin, opts.listingId);
    if (opts.kind === "dispute") {
      await notifyAdmins(admin, {
        type: NotificationType.PAYMENT_ISSUE_REQUIRES_REVIEW,
        title: "Payment issue requires review",
        message: `A payment dispute was opened for ${title}.`,
        entityId: opts.transactionId,
        actionUrl: adminTransactionUrl(opts.transactionId),
        actionLabel: "Review transaction",
        requiresAction: true,
      });
    } else {
      await notifyAdmins(admin, {
        type: NotificationType.REFUND_REQUIRES_ACTION,
        title: "Refund requires action",
        message: `A refund failed or needs completion for ${title}.`,
        entityId: opts.transactionId,
        actionUrl: adminTransactionUrl(opts.transactionId),
        actionLabel: "Review refund",
        requiresAction: true,
      });
    }
  } catch (e) {
    console.error("notifyPaymentIssue failed", e);
  }
}

export async function notifyPayoutFailed(
  admin: SupabaseClient,
  opts: { transactionId: string; listingId?: string | null }
): Promise<void> {
  try {
    const title = await titleFor(admin, opts.listingId);
    await notifyAdmins(admin, {
      type: NotificationType.SELLER_PAYOUT_FAILED,
      title: "Seller payout failed",
      message: `Stripe reported a payout/transfer failure for ${title}.`,
      entityId: opts.transactionId,
      actionUrl: adminTransactionUrl(opts.transactionId),
      actionLabel: "Review payout",
      requiresAction: true,
    });
  } catch (e) {
    console.error("notifyPayoutFailed failed", e);
  }
}

export async function notifySellerPayoutAccountIssue(
  admin: SupabaseClient,
  opts: { transactionId: string; listingId?: string | null }
): Promise<void> {
  try {
    const title = await titleFor(admin, opts.listingId);
    await notifyAdmins(admin, {
      type: NotificationType.SELLER_PAYOUT_ACCOUNT_ISSUE,
      title: "Seller payout account issue",
      message: `The seller's Stripe account is not payout-eligible for ${title}.`,
      entityId: opts.transactionId,
      actionUrl: adminTransactionUrl(opts.transactionId),
      actionLabel: "Review seller account",
      requiresAction: true,
    });
  } catch (e) {
    console.error("notifySellerPayoutAccountIssue failed", e);
  }
}

export async function resolvePaymentAndRefundNotifications(
  admin: SupabaseClient,
  transactionId: string
): Promise<void> {
  try {
    await resolveNotifications(admin, {
      types: [
        NotificationType.PAYMENT_ISSUE_REQUIRES_REVIEW,
        NotificationType.REFUND_REQUIRES_ACTION,
        NotificationType.DELIVERY_ISSUE_REPORTED,
        NotificationType.FUNDS_RELEASE_REQUIRES_ACTION,
        NotificationType.TRANSACTION_STUCK,
      ],
      entityId: transactionId,
    });
  } catch (e) {
    console.error("resolvePaymentAndRefundNotifications failed", e);
  }
}

export async function notifyListingReviewRequired(
  admin: SupabaseClient,
  opts: { listingId: string; title: string }
): Promise<void> {
  try {
    const title = opts.title.trim() || "a new listing";
    await notifyAdmins(admin, {
      type: NotificationType.LISTING_REVIEW_REQUIRED,
      title: "Listing review required",
      message: `A seller has submitted ${title} for verification.`,
      entityType: NotificationEntityType.LISTING,
      entityId: opts.listingId,
      actionUrl: adminListingUrl(opts.listingId),
      actionLabel: "Review listing",
      requiresAction: true,
    });
  } catch (e) {
    console.error("notifyListingReviewRequired failed", e);
  }
}

export async function resolveListingReviewRequired(
  admin: SupabaseClient,
  listingId: string
): Promise<void> {
  try {
    await resolveNotifications(admin, {
      types: [NotificationType.LISTING_REVIEW_REQUIRED],
      entityId: listingId,
    });
  } catch (e) {
    console.error("resolveListingReviewRequired failed", e);
  }
}
