/**
 * Shared helpers for fulfilment-related transactional / admin alert emails.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureEmailSent, EmailTriggerType, getListingEmailContext } from "@/lib/email-triggers";
import { FulfilmentMode } from "@/lib/fulfilment-providers";
import { BOX_TYPE_LABELS, type BoxType } from "@/lib/fulfilment";
import { formatSellerAddress } from "@/lib/starter-pack";
import { getAppUrl } from "@/lib/app-env";

export function getAdminAlertEmail(): string | null {
  return getAdminAlertEmails()[0] ?? null;
}

/** All TEEVO_ADMIN_EMAILS addresses (comma-separated). */
export function getAdminAlertEmails(): string[] {
  return (process.env.TEEVO_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter((e) => e && e !== "admin@example.com");
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

  const { itemName, hero_image } = await getListingEmailContext(admin, opts.listingId);
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
    subject: `\uD83D\uDCE6 Packaging ready for review \u2014 #${orderShort}`,
    type: "alert",
    variables: {
      title: `Packaging ready for review \u2014 #${orderShort}`,
      subtitle: itemName,
      body: [
        `Order #${orderShort} \u00B7 ${itemName}`,
        seller?.email ? `Seller: ${seller.email}` : "",
        ``,
        `A seller has submitted packaging photos for review.`,
      ]
        .filter(Boolean)
        .join("\n"),
      order_number: orderShort,
      hero_image,
      cta_link: `${appUrl}/admin/packaging`,
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

  const { itemName, hero_image } = await getListingEmailContext(admin, opts.listingId);
  const orderShort = opts.transactionId.slice(0, 8);
  const appUrl = getAppUrl();
  const isManual = opts.fulfilmentMode === FulfilmentMode.MANUAL;

  const nextStep = isManual
    ? "We\u2019re preparing your tracked shipping label. You\u2019ll receive another email shortly with your label and tracking details. You can also check progress in your Sales dashboard."
    : "Your packaging looks good \u2014 you\u2019re ready to generate your shipping label. Head to your Sales dashboard to continue.";

  await ensureEmailSent(admin, {
    emailType: EmailTriggerType.PACKAGING_APPROVED,
    referenceId: opts.transactionId,
    recipientId: opts.sellerId,
    to: seller.email,
    subject: `\u2705 Packaging approved \u2014 you\u2019re good to go!`,
    type: "transactional",
    variables: {
      title: "Packaging approved",
      subtitle: "Your club is securely packed and ready for its journey.",
      body: nextStep,
      order_number: orderShort,
      item_name: itemName,
      hero_image,
      cta_link: `${appUrl}/dashboard/sales`,
      cta_text: "Continue to shipping",
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

  const { itemName, hero_image } = await getListingEmailContext(admin, opts.listingId);
  const orderShort = opts.transactionId.slice(0, 8);
  const appUrl = getAppUrl();
  const notesBlock = opts.notes
    ? `Our team left the following feedback:<br /><br />${opts.notes}`
    : "Please check your Sales dashboard for details, then upload new packaging photos.";

  await ensureEmailSent(admin, {
    emailType: EmailTriggerType.PACKAGING_REJECTED,
    // Unique per rejection so a later re-reject can notify again
    referenceId: `${opts.transactionId}:${opts.reviewedAt}`,
    recipientId: opts.sellerId,
    to: seller.email,
    subject: `\uD83D\uDCF8 Quick fix needed with your packaging`,
    type: "transactional",
    variables: {
      title: "A quick fix is needed with your packaging",
      subtitle: "Please update your photos and resubmit when ready.",
      body: notesBlock,
      order_number: orderShort,
      item_name: itemName,
      hero_image,
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

  const { itemName, hero_image } = await getListingEmailContext(admin, opts.listingId);
  const { data: seller } = await admin.from("users").select("email").eq("id", opts.sellerId).single();
  const orderShort = opts.transactionId.slice(0, 8);
  const appUrl = getAppUrl();

  await ensureEmailSent(admin, {
    emailType: EmailTriggerType.MANUAL_LABEL_NEEDED_ADMIN,
    referenceId: opts.transactionId,
    recipientId: null,
    to,
    subject: `\uD83C\uDFF7\uFE0F Shipping label needed \u2014 #${orderShort}`,
    type: "alert",
    variables: {
      title: `Shipping label needed \u2014 #${orderShort}`,
      subtitle: itemName,
      body: [
        `Order #${orderShort} \u00B7 ${itemName}`,
        seller?.email ? `Seller: ${seller.email}` : "",
        ``,
        `Packaging is approved. Provide the courier tracking details and label PDF so the seller can dispatch.`,
      ]
        .filter(Boolean)
        .join("\n"),
      order_number: orderShort,
      hero_image,
      cta_link: `${appUrl}/admin/fulfilment`,
      cta_text: "Awaiting labels",
    },
  }).catch((e) => console.error("Admin manual-label-needed email failed", e));
}

function formatPersonName(u: {
  first_name?: string | null;
  surname?: string | null;
  display_name?: string | null;
  email?: string | null;
}): string {
  return [u.first_name, u.surname].filter(Boolean).join(" ") || u.display_name || u.email || "Seller";
}

function boxTypeLabel(boxType: string | null | undefined): string {
  if (boxType && boxType in BOX_TYPE_LABELS) {
    return BOX_TYPE_LABELS[boxType as BoxType];
  }
  return boxType || "Teevo box";
}

export async function notifySellerStarterPackRequested(
  admin: SupabaseClient,
  opts: { transactionId: string; listingId: string; sellerId: string }
): Promise<void> {
  const { data: seller } = await admin.from("users").select("email").eq("id", opts.sellerId).single();
  if (!seller?.email) return;

  const { itemName, hero_image } = await getListingEmailContext(admin, opts.listingId);
  const orderShort = opts.transactionId.slice(0, 8);
  const appUrl = getAppUrl();

  await ensureEmailSent(admin, {
    emailType: EmailTriggerType.STARTER_PACK_REQUESTED,
    referenceId: opts.transactionId,
    recipientId: opts.sellerId,
    to: seller.email,
    subject: "\uD83D\uDCE6 Your free Teevo Starter Pack is being prepped!",
    type: "transactional",
    variables: {
      title: "Your free Starter Pack is on its way",
      subtitle: "We\u2019re preparing the packaging you need to safely ship your club.",
      body: [
        "We\u2019ve received your request. Teevo will send you suitable packaging \u2014 you don\u2019t need to buy anything.",
        "",
        "Once your packaging arrives, follow the next steps in your Teevo Sales dashboard to pack your club, take photos, and get it dispatched.",
      ].join("<br />"),
      order_number: orderShort,
      item_name: itemName,
      hero_image,
      cta_link: `${appUrl}/dashboard/sales`,
      cta_text: "View your sale",
    },
  });
}

export async function notifyAdminStarterPackRequested(
  admin: SupabaseClient,
  opts: {
    transactionId: string;
    listingId: string;
    sellerId: string;
    boxType: string | null;
    requestedAt: string;
  }
): Promise<boolean> {
  const to = getAdminAlertEmail();
  if (!to) return false;

  const { itemName, hero_image } = await getListingEmailContext(admin, opts.listingId);
  const { data: listing } = await admin
    .from("listings")
    .select("category, brand, model")
    .eq("id", opts.listingId)
    .single();
  const { data: seller } = await admin
    .from("users")
    .select("email, display_name, first_name, surname, address_line1, address_line2, address_city, address_postcode, address_country")
    .eq("id", opts.sellerId)
    .single();

  const orderShort = opts.transactionId.slice(0, 8);
  const appUrl = getAppUrl();
  const sellerName = seller ? formatPersonName(seller) : "Seller";
  const address = seller ? formatSellerAddress(seller) : "";
  const requested = (() => {
    try {
      return new Date(opts.requestedAt).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return opts.requestedAt;
    }
  })();

  await ensureEmailSent(admin, {
    emailType: EmailTriggerType.STARTER_PACK_REQUESTED_ADMIN,
    referenceId: opts.transactionId,
    recipientId: null,
    to,
    subject: "\uD83D\uDEA8 Starter Pack request needs action",
    type: "alert",
    variables: {
      title: "Starter Pack request needs action",
      subtitle: itemName,
      body: [
        `Seller: ${sellerName}`,
        seller?.email ? `Seller email: ${seller.email}` : "",
        `Order: #${orderShort}`,
        `Item: ${itemName}`,
        listing?.category ? `Club type: ${listing.category}` : "",
        `Packaging required: ${boxTypeLabel(opts.boxType)}`,
        address ? `Deliver to: ${address}` : "Deliver to: (no postage address on file)",
        `Requested: ${requested}`,
        "",
        "Ship the appropriate Teevo box to the seller, then mark the Starter Pack as dispatched in Admin.",
      ]
        .filter((line) => line !== "")
        .join("<br />"),
      order_number: orderShort,
      hero_image,
      cta_link: `${appUrl}/admin/starter-packs?id=${opts.transactionId}`,
      cta_text: "View Starter Pack request",
    },
  });

  return true;
}

export async function notifySellerStarterPackDispatched(
  admin: SupabaseClient,
  opts: {
    transactionId: string;
    listingId: string;
    sellerId: string;
    courier: string;
    trackingNumber: string;
    trackingUrl: string;
  }
): Promise<void> {
  const { data: seller } = await admin.from("users").select("email").eq("id", opts.sellerId).single();
  if (!seller?.email) return;

  const { itemName, hero_image } = await getListingEmailContext(admin, opts.listingId);
  const orderShort = opts.transactionId.slice(0, 8);
  const appUrl = getAppUrl();

  await ensureEmailSent(admin, {
    emailType: EmailTriggerType.STARTER_PACK_DISPATCHED,
    referenceId: opts.transactionId,
    recipientId: opts.sellerId,
    to: seller.email,
    subject: "\uD83D\uDE9A Your Teevo Starter Pack is on its way!",
    type: "transactional",
    variables: {
      title: "Your Starter Pack is on its way",
      subtitle: "Your free Teevo packaging has been dispatched.",
      body: [
        "Your shipping box is on its way to you.",
        `${opts.courier}: ${opts.trackingNumber}`,
        "",
        "Once it arrives, follow the next steps in your Teevo Sales dashboard to pack your club, take photos, and get it dispatched.",
      ].join("<br />"),
      order_number: orderShort,
      item_name: itemName,
      hero_image,
      cta_link: opts.trackingUrl || `${appUrl}/dashboard/sales`,
      cta_text: "Track your box",
    },
  });
}
