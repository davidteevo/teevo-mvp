import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  AvailabilityConfirmationSource,
  AvailabilityConfirmationStatus,
} from "@/lib/dispatch-deadline";
import { createAvailabilityToken } from "@/lib/availability-token";
import { getAppUrl } from "@/lib/app-env";
import {
  EmailTriggerType,
  ensureEmailSent,
  listingHeroFromImages,
  listingItemName,
} from "@/lib/email-triggers";
import {
  NotificationEntityType,
  NotificationType,
  createNotification,
  resolveNotifications,
} from "@/lib/notifications";
import { notifyWatchersUnavailable } from "@/lib/watchlist-emails";
import { trackServerEvent } from "@/lib/starter-pack";
import { logAdminAction } from "@/lib/referral/admin-auth";
import type { ListingImageRow } from "@/lib/listing-images";

export const LISTING_AVAILABILITY_SELECT =
  "id, user_id, status, archived_at, buying_paused, availability_confirmation_status, availability_confirmation_source, availability_confirmation_requested_at, availability_confirmed_at, availability_confirmation_reminder_sent_at, availability_confirmation_batch_id, brand, model, title, category";

export type AdminAvailabilityListing = {
  id: string;
  user_id: string;
  status: string;
  archived_at: string | null;
  buying_paused: boolean | null;
  availability_confirmation_status: string | null;
  availability_confirmation_source: string | null;
  availability_confirmation_requested_at: string | null;
  availability_confirmed_at: string | null;
  availability_confirmation_reminder_sent_at: string | null;
  availability_confirmation_batch_id: string | null;
  brand?: string | null;
  model?: string | null;
  title?: string | null;
  category?: string | null;
  listing_images?: ListingImageRow[] | null;
};

export type SkipReason =
  | "active_order"
  | "archived"
  | "not_verified"
  | "dispatch_timeout"
  | "already_required"
  | "not_found";

export type ConfirmAvailabilityItem = {
  id: string;
  title: string;
  status: string;
  available: boolean | null;
};

type BatchRow = {
  id: string;
  seller_id: string;
  requested_by_admin_id: string | null;
  created_at: string;
  email_sent_at: string | null;
  email_error: string | null;
  reminder_sent_at: string | null;
  reminder_error: string | null;
};

function nowIso(): string {
  return new Date().toISOString();
}

export function revalidateListingAvailability(listingIds: string[]): void {
  try {
    revalidateTag("public-listings");
    revalidatePath("/");
    for (const id of listingIds) {
      revalidatePath(`/listing/${id}`);
      revalidateTag(`listing-${id}`);
    }
  } catch (e) {
    console.error("revalidate listing availability failed", e);
  }
}

export async function listingHasOpenPaidOrder(
  admin: SupabaseClient,
  listingId: string,
  status?: string | null
): Promise<boolean> {
  if (status === "sold") return true;
  const { data } = await admin
    .from("transactions")
    .select("id, status, cancellation_status")
    .eq("listing_id", listingId)
    .in("status", ["pending", "shipped"])
    .limit(10);
  return (data ?? []).some((tx) => tx.cancellation_status !== "completed");
}

export async function setListingBuyingPaused(
  admin: SupabaseClient,
  opts: { listingIds: string[]; paused: boolean; adminId: string }
): Promise<{ updated: string[]; skipped: { id: string; reason: SkipReason }[] }> {
  const { listingIds, paused, adminId } = opts;
  const unique = Array.from(new Set(listingIds.filter(Boolean)));
  const updated: string[] = [];
  const skipped: { id: string; reason: SkipReason }[] = [];
  if (unique.length === 0) return { updated, skipped };

  const { data: rows } = await admin
    .from("listings")
    .select("id, status, archived_at")
    .in("id", unique);

  const byId = new Map((rows ?? []).map((r) => [r.id as string, r]));
  const eligible: string[] = [];
  for (const id of unique) {
    const listing = byId.get(id);
    if (!listing) {
      skipped.push({ id, reason: "not_found" });
      continue;
    }
    if (await listingHasOpenPaidOrder(admin, id, listing.status)) {
      skipped.push({ id, reason: "active_order" });
      continue;
    }
    eligible.push(id);
  }

  if (eligible.length > 0) {
    const { error } = await admin
      .from("listings")
      .update({ buying_paused: paused, updated_at: nowIso() })
      .in("id", eligible);
    if (error) throw new Error(error.message);
    updated.push(...eligible);
    await logAdminAction(admin, {
      adminId,
      action: paused ? "listing_buying_paused" : "listing_buying_resumed",
      targetType: "listing",
      targetId: eligible[0],
      payload: { listing_ids: eligible, paused },
    });
    revalidateListingAvailability(eligible);
  }
  return { updated, skipped };
}

async function settingDays(admin: SupabaseClient, key: string, fallback: number): Promise<number> {
  const { data } = await admin.from("platform_settings").select("value").eq("key", key).maybeSingle();
  const n = Number(data?.value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function loadSeller(
  admin: SupabaseClient,
  sellerId: string
): Promise<{ email: string | null; first_name: string | null } | null> {
  const { data } = await admin
    .from("users")
    .select("email, first_name")
    .eq("id", sellerId)
    .maybeSingle();
  return data;
}

function confirmPageUrl(token: string): string {
  return `${getAppUrl()}/confirm-availability?token=${encodeURIComponent(token)}`;
}

function listingLabel(listing: {
  brand?: string | null;
  model?: string | null;
  title?: string | null;
  category?: string | null;
}): string {
  return listingItemName(listing);
}

async function requiredListingsForSeller(
  admin: SupabaseClient,
  sellerId: string
): Promise<AdminAvailabilityListing[]> {
  const { data } = await admin
    .from("listings")
    .select(
      `${LISTING_AVAILABILITY_SELECT}, listing_images(storage_path, sort_order)`
    )
    .eq("user_id", sellerId)
    .eq("availability_confirmation_status", AvailabilityConfirmationStatus.REQUIRED)
    .eq("availability_confirmation_source", AvailabilityConfirmationSource.ADMIN_RECONFIRM)
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  return (data ?? []) as AdminAvailabilityListing[];
}

async function sendReconfirmEmail(
  admin: SupabaseClient,
  opts: {
    batch: BatchRow;
    seller: { email: string | null; first_name: string | null };
    listings: AdminAvailabilityListing[];
    reminder: boolean;
    uniqueReference?: boolean;
  }
): Promise<{ sent: boolean; error: string | null }> {
  const { batch, seller, listings, reminder, uniqueReference } = opts;
  if (!seller.email) return { sent: false, error: "Seller has no email" };
  if (listings.length === 0) return { sent: false, error: "No listings awaiting confirmation" };

  const token = createAvailabilityToken(batch.id, batch.seller_id);
  const cta = confirmPageUrl(token);
  const firstName = seller.first_name?.trim() || "there";
  const names = listings.map(listingLabel);
  const single = listings.length === 1;
  const product = names[0];
  const subject = reminder
    ? single
      ? `Reminder: is your ${product} still available?`
      : `Reminder: are these ${listings.length} items still available?`
    : single
      ? `Is your ${product} still available?`
      : `Are these ${listings.length} items still available?`;

  const hi = `Hi ${firstName},`;
  const intro = reminder
    ? `Just a reminder — we still need to know whether you have ${single ? `your ${product}` : "these items"} on Teevo.`
    : `It's been a little while since you listed ${single ? `your ${product}` : "these items"} on Teevo.`;
  const yesNo = single
    ? `<a href="${cta}&amp;listingId=${encodeURIComponent(listings[0].id)}&amp;available=true">Yes, it's still available</a><br /><a href="${cta}&amp;listingId=${encodeURIComponent(listings[0].id)}&amp;available=false">No, I've sold it / it's no longer available</a>`
    : names.map((n) => `• ${n}`).join("<br />");
  const body = `${hi}<br /><br />${intro}<br /><br />Before we make ${single ? "it" : "them"} available for buyers again, we'd just like to check that you still have ${single ? "it" : "them"}.<br /><br />${yesNo}<br /><br />It only takes a second to confirm.<br /><br />Thanks,<br />Team Teevo`;

  const hero = listingHeroFromImages(listings[0]?.listing_images, product);
  const emailType = reminder
    ? EmailTriggerType.LISTING_AVAILABILITY_RECONFIRM_REMINDER
    : EmailTriggerType.LISTING_AVAILABILITY_RECONFIRM;
  const referenceId = reminder
    ? `${batch.id}:reminder${uniqueReference ? `:${Date.now()}` : ""}`
    : `${batch.id}:reconfirm${uniqueReference ? `:${Date.now()}` : ""}`;

  try {
    const sent = await ensureEmailSent(admin, {
      emailType,
      referenceId,
      referenceType: "listing",
      recipientId: batch.seller_id,
      to: seller.email,
      subject,
      type: "standard",
      variables: {
        title: single ? `Is your ${product} still available?` : `Are these ${listings.length} items still available?`,
        subtitle: reminder ? "Please confirm when you can." : "We just need a quick check before buyers can purchase.",
        body,
        hero_image: hero,
        cta_link: cta,
        cta_text: single ? "Confirm availability" : "Confirm your listings",
      },
    });
    return { sent, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Email failed";
    console.error("availability reconfirm email failed", e);
    return { sent: false, error: message };
  }
}

async function notifySellerReconfirm(
  admin: SupabaseClient,
  sellerId: string,
  batchId: string,
  listings: AdminAvailabilityListing[]
): Promise<void> {
  const single = listings.length === 1;
  const title = single
    ? `Is your ${listingLabel(listings[0])} still available?`
    : `Are these ${listings.length} items still available?`;
  await createNotification(admin, {
    userId: sellerId,
    type: NotificationType.RECONFIRM_LISTING_AVAILABILITY,
    title,
    message: "Confirm availability to make your listing available to buyers.",
    entityType: NotificationEntityType.LISTING,
    entityId: batchId,
    actionUrl: "/dashboard/listings/confirm",
    actionLabel: "Confirm availability",
    requiresAction: true,
  });
}

export async function requestAvailabilityReconfirm(
  admin: SupabaseClient,
  opts: { listingIds: string[]; adminId: string }
): Promise<{
  requested: string[];
  skipped: { id: string; reason: SkipReason }[];
  sellers: number;
  emailErrors: number;
}> {
  const unique = Array.from(new Set(opts.listingIds.filter(Boolean)));
  const requested: string[] = [];
  const skipped: { id: string; reason: SkipReason }[] = [];
  if (unique.length === 0) return { requested, skipped, sellers: 0, emailErrors: 0 };

  const { data: rows } = await admin
    .from("listings")
    .select(LISTING_AVAILABILITY_SELECT)
    .in("id", unique);

  const byId = new Map((rows ?? []).map((r) => [r.id as string, r as AdminAvailabilityListing]));
  const eligible: AdminAvailabilityListing[] = [];
  for (const id of unique) {
    const listing = byId.get(id);
    if (!listing) {
      skipped.push({ id, reason: "not_found" });
      continue;
    }
    if (listing.archived_at) {
      skipped.push({ id, reason: "archived" });
      continue;
    }
    if (listing.status !== "verified") {
      skipped.push({ id, reason: listing.status === "sold" ? "active_order" : "not_verified" });
      continue;
    }
    if (await listingHasOpenPaidOrder(admin, id, listing.status)) {
      skipped.push({ id, reason: "active_order" });
      continue;
    }
    if (
      listing.availability_confirmation_status === AvailabilityConfirmationStatus.REQUIRED &&
      listing.availability_confirmation_source === AvailabilityConfirmationSource.DISPATCH_TIMEOUT
    ) {
      skipped.push({ id, reason: "dispatch_timeout" });
      continue;
    }
    if (
      listing.availability_confirmation_status === AvailabilityConfirmationStatus.REQUIRED &&
      listing.availability_confirmation_source === AvailabilityConfirmationSource.ADMIN_RECONFIRM
    ) {
      skipped.push({ id, reason: "already_required" });
      continue;
    }
    eligible.push(listing);
  }

  const bySeller = new Map<string, AdminAvailabilityListing[]>();
  for (const listing of eligible) {
    const list = bySeller.get(listing.user_id) ?? [];
    list.push(listing);
    bySeller.set(listing.user_id, list);
  }

  let emailErrors = 0;
  const stamp = nowIso();

  for (const [sellerId, listings] of Array.from(bySeller.entries())) {
    const { data: existingRequired } = await admin
      .from("listings")
      .select("availability_confirmation_batch_id")
      .eq("user_id", sellerId)
      .eq("availability_confirmation_status", AvailabilityConfirmationStatus.REQUIRED)
      .eq("availability_confirmation_source", AvailabilityConfirmationSource.ADMIN_RECONFIRM)
      .not("availability_confirmation_batch_id", "is", null)
      .limit(1)
      .maybeSingle();

    let reusedBatch = Boolean(existingRequired?.availability_confirmation_batch_id);
    let batchId = existingRequired?.availability_confirmation_batch_id as string | null;
    if (!batchId) {
      const { data: batch, error: batchErr } = await admin
        .from("listing_availability_batches")
        .insert({
          seller_id: sellerId,
          requested_by_admin_id: opts.adminId,
        })
        .select("id")
        .single();
      if (batchErr || !batch) throw new Error(batchErr?.message ?? "Could not create availability batch");
      batchId = batch.id;
    }
    if (!batchId) continue;

    const ids = listings.map((l: AdminAvailabilityListing) => l.id);
    const { error: updateErr } = await admin
      .from("listings")
      .update({
        availability_confirmation_status: AvailabilityConfirmationStatus.REQUIRED,
        availability_confirmation_source: AvailabilityConfirmationSource.ADMIN_RECONFIRM,
        availability_confirmation_requested_at: stamp,
        availability_confirmation_batch_id: batchId,
        availability_confirmation_reminder_sent_at: null,
        updated_at: stamp,
      })
      .in("id", ids);
    if (updateErr) throw new Error(updateErr.message);
    requested.push(...ids);

    await logAdminAction(admin, {
      adminId: opts.adminId,
      action: "listing_availability_reconfirm_requested",
      targetType: "listing",
      targetId: ids[0],
      payload: { listing_ids: ids, batch_id: batchId, seller_id: sellerId },
    });

    const allRequired = await requiredListingsForSeller(admin, sellerId);
    const { data: batch } = await admin
      .from("listing_availability_batches")
      .select("*")
      .eq("id", batchId)
      .single();
    const seller = await loadSeller(admin, sellerId);
    if (batch && seller) {
      const result = await sendReconfirmEmail(admin, {
        batch: batch as BatchRow,
        seller,
        listings: allRequired,
        reminder: false,
        uniqueReference: reusedBatch,
      });
      await admin
        .from("listing_availability_batches")
        .update({
          email_sent_at: result.error ? batch.email_sent_at : nowIso(),
          email_error: result.error,
        })
        .eq("id", batchId);
      if (result.error) emailErrors += 1;
    } else {
      emailErrors += 1;
    }
    await notifySellerReconfirm(admin, sellerId, batchId, allRequired);
  }

  if (requested.length) revalidateListingAvailability(requested);
  return { requested, skipped, sellers: bySeller.size, emailErrors };
}

export async function resendAvailabilityBatch(
  admin: SupabaseClient,
  opts: { batchId: string; reminder?: boolean }
): Promise<{ ok: boolean; error?: string }> {
  const { data: batch } = await admin
    .from("listing_availability_batches")
    .select("*")
    .eq("id", opts.batchId)
    .maybeSingle();
  if (!batch) return { ok: false, error: "Batch not found" };
  const listings = await requiredListingsForSeller(admin, batch.seller_id);
  const remaining = listings.filter((l) => l.availability_confirmation_batch_id === batch.id);
  const seller = await loadSeller(admin, batch.seller_id);
  if (!seller) return { ok: false, error: "Seller not found" };
  const result = await sendReconfirmEmail(admin, {
    batch: batch as BatchRow,
    seller,
    listings: remaining.length ? remaining : listings,
    reminder: opts.reminder === true,
    uniqueReference: opts.reminder !== true,
  });
  const stamp = nowIso();
  if (opts.reminder) {
    await admin
      .from("listing_availability_batches")
      .update({
        reminder_sent_at: result.error ? batch.reminder_sent_at : stamp,
        reminder_error: result.error,
      })
      .eq("id", batch.id);
    if (!result.error) {
      const ids = (remaining.length ? remaining : listings).map((l) => l.id);
      if (ids.length) {
        await admin
          .from("listings")
          .update({ availability_confirmation_reminder_sent_at: stamp, updated_at: stamp })
          .in("id", ids);
      }
    }
  } else {
    await admin
      .from("listing_availability_batches")
      .update({
        email_sent_at: result.error ? batch.email_sent_at : stamp,
        email_error: result.error,
      })
      .eq("id", batch.id);
  }
  if (result.error) return { ok: false, error: result.error };
  await notifySellerReconfirm(admin, batch.seller_id, batch.id, remaining.length ? remaining : listings);
  return { ok: true };
}

export async function loadConfirmableListingsForSeller(
  admin: SupabaseClient,
  sellerId: string,
  batchId?: string | null
): Promise<ConfirmAvailabilityItem[]> {
  let query = admin
    .from("listings")
    .select("id, brand, model, title, category, availability_confirmation_status, availability_confirmation_source, availability_confirmation_batch_id")
    .eq("user_id", sellerId)
    .eq("availability_confirmation_status", AvailabilityConfirmationStatus.REQUIRED)
    .eq("availability_confirmation_source", AvailabilityConfirmationSource.ADMIN_RECONFIRM)
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  if (batchId) query = query.eq("availability_confirmation_batch_id", batchId);
  const { data } = await query;
  return (data ?? []).map((l) => ({
    id: l.id,
    title: listingLabel(l),
    status: l.availability_confirmation_status,
    available: null,
  }));
}

export async function applySellerAvailabilityResponses(
  admin: SupabaseClient,
  opts: {
    sellerId: string;
    responses: { listingId: string; available: boolean }[];
  }
): Promise<{ updated: { id: string; available: boolean }[]; remaining: number }> {
  const stamp = nowIso();
  const updated: { id: string; available: boolean }[] = [];
  const listingIds = opts.responses.map((r) => r.listingId);
  if (listingIds.length === 0) return { updated, remaining: 0 };

  const { data: rows } = await admin
    .from("listings")
    .select(LISTING_AVAILABILITY_SELECT)
    .in("id", listingIds)
    .eq("user_id", opts.sellerId)
    .eq("availability_confirmation_status", AvailabilityConfirmationStatus.REQUIRED)
    .eq("availability_confirmation_source", AvailabilityConfirmationSource.ADMIN_RECONFIRM);

  const allowed = new Map((rows ?? []).map((r) => [r.id as string, r as AdminAvailabilityListing]));
  const batchIds = new Set<string>();

  for (const response of opts.responses) {
    const listing = allowed.get(response.listingId);
    if (!listing) continue;
    if (listing.availability_confirmation_batch_id) {
      batchIds.add(listing.availability_confirmation_batch_id);
    }
    if (response.available) {
      const { error } = await admin
        .from("listings")
        .update({
          availability_confirmation_status: AvailabilityConfirmationStatus.CONFIRMED_AVAILABLE,
          availability_confirmed_at: stamp,
          updated_at: stamp,
        })
        .eq("id", listing.id)
        .eq("availability_confirmation_status", AvailabilityConfirmationStatus.REQUIRED);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await admin
        .from("listings")
        .update({
          availability_confirmation_status: AvailabilityConfirmationStatus.CONFIRMED_UNAVAILABLE,
          archived_at: stamp,
          updated_at: stamp,
        })
        .eq("id", listing.id)
        .eq("availability_confirmation_status", AvailabilityConfirmationStatus.REQUIRED);
      if (error) throw new Error(error.message);
      await notifyWatchersUnavailable(admin, listing.id, "archived").catch((e) =>
        console.error("notifyWatchersUnavailable failed", e)
      );
    }
    updated.push({ id: listing.id, available: response.available });
    await trackServerEvent(admin, response.available ? "listing_availability_confirmed" : "listing_availability_unavailable", {
      userId: opts.sellerId,
      properties: { listing_id: listing.id, source: "admin_reconfirm" },
    });
  }

  const remainingRows = await requiredListingsForSeller(admin, opts.sellerId);
  if (remainingRows.length === 0) {
    for (const batchId of Array.from(batchIds)) {
      await resolveNotifications(admin, {
        userId: opts.sellerId,
        types: [NotificationType.RECONFIRM_LISTING_AVAILABILITY],
        entityId: batchId,
      });
    }
  }

  if (updated.length) revalidateListingAvailability(updated.map((u) => u.id));
  return { updated, remaining: remainingRows.length };
}

export async function runAvailabilityReconfirmCron(
  admin: SupabaseClient
): Promise<{ reminders: number; expired: number }> {
  const reminderDays = await settingDays(admin, "availability_reminder_days", 2);
  const expireDays = await settingDays(admin, "availability_expire_days", 7);
  const reminderCutoff = new Date(Date.now() - reminderDays * 24 * 60 * 60 * 1000).toISOString();
  const expireCutoff = new Date(Date.now() - expireDays * 24 * 60 * 60 * 1000).toISOString();
  let reminders = 0;
  let expired = 0;

  const { data: dueReminders } = await admin
    .from("listings")
    .select("id, user_id, availability_confirmation_batch_id, availability_confirmation_requested_at")
    .eq("availability_confirmation_status", AvailabilityConfirmationStatus.REQUIRED)
    .eq("availability_confirmation_source", AvailabilityConfirmationSource.ADMIN_RECONFIRM)
    .is("availability_confirmation_reminder_sent_at", null)
    .lte("availability_confirmation_requested_at", reminderCutoff)
    .limit(200);

  const reminderBatches = new Set<string>();
  for (const row of dueReminders ?? []) {
    if (row.availability_confirmation_batch_id) reminderBatches.add(row.availability_confirmation_batch_id);
  }
  for (const batchId of Array.from(reminderBatches)) {
    const result = await resendAvailabilityBatch(admin, { batchId, reminder: true });
    if (result.ok) reminders += 1;
  }

  const { data: dueExpire } = await admin
    .from("listings")
    .select("id, user_id, availability_confirmation_batch_id")
    .eq("availability_confirmation_status", AvailabilityConfirmationStatus.REQUIRED)
    .eq("availability_confirmation_source", AvailabilityConfirmationSource.ADMIN_RECONFIRM)
    .lte("availability_confirmation_requested_at", expireCutoff)
    .limit(200);

  const stamp = nowIso();
  const expireIds = (dueExpire ?? []).map((r) => r.id as string);
  if (expireIds.length > 0) {
    const { error } = await admin
      .from("listings")
      .update({
        availability_confirmation_status: AvailabilityConfirmationStatus.EXPIRED,
        archived_at: stamp,
        updated_at: stamp,
      })
      .in("id", expireIds)
      .eq("availability_confirmation_status", AvailabilityConfirmationStatus.REQUIRED);
    if (error) throw new Error(error.message);
    expired = expireIds.length;
    for (const row of dueExpire ?? []) {
      await notifyWatchersUnavailable(admin, row.id, "archived").catch((e) =>
        console.error("notifyWatchersUnavailable failed", e)
      );
      await trackServerEvent(admin, "listing_availability_expired", {
        userId: row.user_id,
        properties: { listing_id: row.id },
      });
    }
    const remainingBySeller = new Map<string, string[]>();
    for (const row of dueExpire ?? []) {
      if (!row.availability_confirmation_batch_id) continue;
      const list = remainingBySeller.get(row.user_id) ?? [];
      list.push(row.availability_confirmation_batch_id);
      remainingBySeller.set(row.user_id, list);
    }
    for (const [sellerId, batchIds] of Array.from(remainingBySeller.entries())) {
      const still = await requiredListingsForSeller(admin, sellerId);
      if (still.length === 0) {
        for (const batchId of Array.from(new Set(batchIds))) {
          await resolveNotifications(admin, {
            userId: sellerId,
            types: [NotificationType.RECONFIRM_LISTING_AVAILABILITY],
            entityId: batchId,
          });
        }
      }
    }
    revalidateListingAvailability(expireIds);
  }

  return { reminders, expired };
}
