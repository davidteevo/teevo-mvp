/**
 * Shared helpers for fulfilment-related transactional / admin alert emails.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureEmailSent, EmailTriggerType } from "@/lib/email-triggers";
import { FulfilmentMode } from "@/lib/fulfilment-providers";
import { getAppUrl } from "@/lib/app-env";

export function getAdminAlertEmail(): string | null {
  const adminTo = process.env.TEEVO_ADMIN_EMAILS?.trim()?.split(",")[0]?.trim();
  if (!adminTo || adminTo === "admin@example.com") return null;
  return adminTo;
}

async function getItemName(
  admin: SupabaseClient,
  listingId: string | null | undefined
): Promise<string> {
  if (!listingId) return "Your item";
  const { data: listing } = await admin
    .from("listings")
    .select("brand, model")
    .eq("id", listingId)
    .single();
  return listing ? `${listing.brand} ${listing.model}` : "Your item";
}

/** Clear idempotency row so a later event of the same type can send again (e.g. resubmit after reject). */
export async function clearSentEmail(
  admin: SupabaseClient,
  emailType: string,
  referenceId: string
): Promise<void> {
  await admin.from("sent_emails").delete().eq("email_type", emailType).eq("reference_id", referenceId);
}

export async function notifyAdminPackagingSubmitted(
  admin: SupabaseClient,
  opts: { transactionId: string; listingId: string; sellerId: string }
): Promise<void> {
  const to = getAdminAlertEmail();
  if (!to) return;

  const itemName = await getItemName(admin, opts.listingId);
  const { data: seller } = await admin.from("users").select("email").eq("id", opts.sellerId).single();
  const orderShort = opts.transactionId.slice(0, 8);
  const appUrl = getAppUrl();

  // Allow a fresh admin alert if the seller re-submits after a rejection.
  await clearSentEmail(admin, EmailTriggerType.PACKAGING_SUBMITTED_ADMIN, opts.transactionId);

  await ensureEmailSent(admin, {
    emailType: EmailTriggerType.PACKAGING_SUBMITTED_ADMIN,
    referenceId: opts.transactionId,
    recipientId: null,
    to,
    subject: `Teevo: packaging photos to review (#${orderShort})`,
    type: "alert",
    variables: {
      title: "Packaging photos to review",
      subtitle: itemName,
      body: [
        `Order #${orderShort} · ${itemName}`,
        seller?.email ? `Seller: ${seller.email}` : "",
        ``,
        `A seller has submitted packaging photos for review.`,
      ]
        .filter(Boolean)
        .join("\n"),
      order_number: orderShort,
      cta_link: `${appUrl}/dashboard/admin/packaging`,
      cta_text: "Review packaging",
    },
  }).catch((e) => console.error("Admin packaging-submitted email failed", e));
}

export async function notifySellerPackagingApproved(
  admin: SupabaseClient,
  opts: {
    transactionId: string;
    listingId: string;
    sellerId: string;
    fulfilmentMode?: string | null;
  }
): Promise<void> {
  const { data: seller } = await admin.from("users").select("email").eq("id", opts.sellerId).single();
  if (!seller?.email) return;

  const itemName = await getItemName(admin, opts.listingId);
  const orderShort = opts.transactionId.slice(0, 8);
  const appUrl = getAppUrl();
  const isManual = opts.fulfilmentMode === FulfilmentMode.MANUAL;

  const nextStep = isManual
    ? "We're preparing your tracked shipping label. You'll receive another email shortly with your label and tracking details. You can also check progress in your Sales dashboard."
    : "You're ready for the next step: generate your shipping label in your Sales dashboard.";

  await ensureEmailSent(admin, {
    emailType: EmailTriggerType.PACKAGING_APPROVED,
    referenceId: opts.transactionId,
    recipientId: opts.sellerId,
    to: seller.email,
    subject: `Packaging approved – next step for your Teevo sale`,
    type: "transactional",
    variables: {
      title: "Packaging approved",
      subtitle: "Your packaging photos look good.",
      body: [`Order #${orderShort} · ${itemName}`, ``, nextStep].join("\n"),
      order_number: orderShort,
      cta_link: `${appUrl}/dashboard/sales`,
      cta_text: "View sales",
    },
  }).catch((e) => console.error("Seller packaging-approved email failed", e));
}

export async function notifySellerPackagingRejected(
  admin: SupabaseClient,
  opts: {
    transactionId: string;
    listingId: string;
    sellerId: string;
    notes: string;
    reviewedAt: string;
  }
): Promise<void> {
  const { data: seller } = await admin.from("users").select("email").eq("id", opts.sellerId).single();
  if (!seller?.email) return;

  const itemName = await getItemName(admin, opts.listingId);
  const orderShort = opts.transactionId.slice(0, 8);
  const appUrl = getAppUrl();
  const notesBlock = opts.notes
    ? `Review notes: ${opts.notes}`
    : "Please check your Sales dashboard for details, then upload new packaging photos.";

  await ensureEmailSent(admin, {
    emailType: EmailTriggerType.PACKAGING_REJECTED,
    // Unique per rejection so a later re-reject can notify again
    referenceId: `${opts.transactionId}:${opts.reviewedAt}`,
    recipientId: opts.sellerId,
    to: seller.email,
    subject: `Packaging photos need attention – Teevo sale #${orderShort}`,
    type: "transactional",
    variables: {
      title: "Packaging needs attention",
      subtitle: "Please update your packaging photos and resubmit.",
      body: [`Order #${orderShort} · ${itemName}`, ``, notesBlock].join("\n"),
      order_number: orderShort,
      cta_link: `${appUrl}/dashboard/sales`,
      cta_text: "Update packaging",
    },
  }).catch((e) => console.error("Seller packaging-rejected email failed", e));
}

export async function notifyAdminManualLabelNeeded(
  admin: SupabaseClient,
  opts: { transactionId: string; listingId: string; sellerId: string }
): Promise<void> {
  const to = getAdminAlertEmail();
  if (!to) return;

  const itemName = await getItemName(admin, opts.listingId);
  const { data: seller } = await admin.from("users").select("email").eq("id", opts.sellerId).single();
  const orderShort = opts.transactionId.slice(0, 8);
  const appUrl = getAppUrl();

  await ensureEmailSent(admin, {
    emailType: EmailTriggerType.MANUAL_LABEL_NEEDED_ADMIN,
    referenceId: opts.transactionId,
    recipientId: null,
    to,
    subject: `Teevo: shipping label needed (#${orderShort})`,
    type: "alert",
    variables: {
      title: "Shipping label needed",
      subtitle: itemName,
      body: [
        `Order #${orderShort} · ${itemName}`,
        seller?.email ? `Seller: ${seller.email}` : "",
        ``,
        `Packaging is approved. Provide the courier tracking details and label PDF so the seller can dispatch.`,
      ]
        .filter(Boolean)
        .join("\n"),
      order_number: orderShort,
      cta_link: `${appUrl}/admin/fulfilment`,
      cta_text: "Awaiting labels",
    },
  }).catch((e) => console.error("Admin manual-label-needed email failed", e));
}
