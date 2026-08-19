import type { SupabaseClient } from "@supabase/supabase-js";
import { EmailTriggerType, ensureEmailSent, formatGbp, listingHeroFromImages } from "@/lib/email-triggers";
import {
  NotificationEntityType,
  NotificationType,
  createNotification,
} from "@/lib/notifications";
import { trackServerEvent } from "@/lib/starter-pack";
import {
  canReceiveWatchlistEmail,
  clubLabel,
  listingAbsoluteUrl,
  similarClubsAbsoluteUrl,
  similarClubsPath,
} from "@/lib/watchlist";
import { isListingPurchasable } from "@/lib/listing-availability";

type ListingRow = {
  id: string;
  brand: string | null;
  model: string | null;
  title: string | null;
  category: string | null;
  price: number;
  status: string;
  archived_at: string | null;
  buying_paused?: boolean | null;
  availability_confirmation_status?: string | null;
  listing_images?: { storage_path: string; sort_order?: number | null }[] | null;
};

type WatcherRow = {
  id: string;
  user_id: string;
  listing_id: string;
  last_availability_email_at: string | null;
  last_now_available_email_at: string | null;
  last_price_alert_at: string | null;
  last_price_alert_pence: number | null;
  last_sold_email_at: string | null;
  created_at: string;
};

type UserRow = { id: string; email: string | null };

async function loadListing(admin: SupabaseClient, listingId: string): Promise<ListingRow | null> {
  const { data } = await admin
    .from("listings")
    .select("id, brand, model, title, category, price, status, archived_at, buying_paused, availability_confirmation_status, listing_images(storage_path, sort_order)")
    .eq("id", listingId)
    .maybeSingle();
  return (data as ListingRow | null) ?? null;
}

async function loadWatchers(admin: SupabaseClient, listingId: string): Promise<WatcherRow[]> {
  const { data, error } = await admin
    .from("watchlist_items")
    .select(
      "id, user_id, listing_id, last_availability_email_at, last_now_available_email_at, last_price_alert_at, last_price_alert_pence, last_sold_email_at, created_at"
    )
    .eq("listing_id", listingId);
  if (error) {
    console.error("loadWatchers failed", error);
    return [];
  }
  return (data ?? []) as WatcherRow[];
}

async function loadUsers(admin: SupabaseClient, userIds: string[]): Promise<Map<string, UserRow>> {
  const map = new Map<string, UserRow>();
  if (userIds.length === 0) return map;
  const { data, error } = await admin.from("users").select("id, email").in("id", userIds);
  if (error) {
    console.error("loadUsers failed", error);
    return map;
  }
  for (const row of data ?? []) map.set(row.id, row as UserRow);
  return map;
}

function listingPurchasable(listing: ListingRow): boolean {
  return isListingPurchasable(listing);
}

function listingHero(listing: ListingRow, name: string): string {
  return listingHeroFromImages(listing.listing_images, name);
}

async function touchWatchlist(
  admin: SupabaseClient,
  id: string,
  updates: Record<string, unknown>
): Promise<void> {
  const { error } = await admin
    .from("watchlist_items")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) console.error("touchWatchlist failed", error);
}

export async function notifyWatchersNowAvailable(
  admin: SupabaseClient,
  listingId: string
): Promise<number> {
  try {
    const listing = await loadListing(admin, listingId);
    if (!listing || !listingPurchasable(listing)) return 0;

    const watchers = await loadWatchers(admin, listingId);
    const users = await loadUsers(admin, watchers.map((w) => w.user_id));
    const name = clubLabel(listing.brand, listing.model, listing.title, listing.category);
    const cta = listingAbsoluteUrl(listing.id, "watchlist_now_available");
    let sent = 0;

    for (const watcher of watchers) {
      if (watcher.last_now_available_email_at) continue;
      const user = users.get(watcher.user_id);
      if (!user?.email || !canReceiveWatchlistEmail(user, "now_available")) continue;

      const ok = await ensureEmailSent(admin, {
        emailType: EmailTriggerType.WATCHLIST_NOW_AVAILABLE,
        referenceId: `${watcher.user_id}:${listing.id}:now_available`,
        referenceType: "watchlist",
        recipientId: watcher.user_id,
        to: user.email,
        subject: `\uD83D\uDFE2 Good news \u2014 your Watchlist club is available!`,
        type: "standard",
        variables: {
          title: `${name} is now available`,
          subtitle: "Good news \u2014 a club on your Watchlist just became available.",
          body: `The ${name} you were watching has passed verification and is now available to buy on Teevo.`,
          hero_image: listingHero(listing, name),
          cta_link: cta,
          cta_text: "View listing",
        },
      }).catch((e) => {
        console.error("watchlist now-available email failed", e);
        return false;
      });

      if (ok) {
        sent += 1;
        await touchWatchlist(admin, watcher.id, {
          last_now_available_email_at: new Date().toISOString(),
        });
        await trackServerEvent(admin, "watchlist_now_available_sent", {
          userId: watcher.user_id,
          properties: { listing_id: listing.id },
        });
      }

      await createNotification(admin, {
        userId: watcher.user_id,
        type: NotificationType.WATCHLIST_NOW_AVAILABLE,
        title: `${name} is now available`,
        message: `The ${name} on your Watchlist is ready to purchase.`,
        entityType: NotificationEntityType.LISTING,
        entityId: listing.id,
        actionUrl: `/listing/${listing.id}`,
        actionLabel: "View listing",
        requiresAction: false,
      });
    }

    return sent;
  } catch (e) {
    console.error("notifyWatchersNowAvailable failed", e);
    return 0;
  }
}

export async function notifyWatchersOfPriceDrop(
  admin: SupabaseClient,
  listingId: string,
  oldPricePence: number,
  newPricePence: number
): Promise<number> {
  try {
    if (!(newPricePence > 0) || newPricePence >= oldPricePence) return 0;
    const listing = await loadListing(admin, listingId);
    if (!listing || !listingPurchasable(listing)) return 0;

    const watchers = await loadWatchers(admin, listingId);
    const users = await loadUsers(admin, watchers.map((w) => w.user_id));
    const name = clubLabel(listing.brand, listing.model, listing.title, listing.category);
    const nowGbp = formatGbp(newPricePence);
    const wasGbp = formatGbp(oldPricePence);
    const cta = listingAbsoluteUrl(listing.id, "watchlist_price_drop");
    let sent = 0;

    for (const watcher of watchers) {
      if (watcher.last_price_alert_pence === newPricePence) continue;
      const user = users.get(watcher.user_id);
      if (!user?.email || !canReceiveWatchlistEmail(user, "price_drop")) continue;

      const ok = await ensureEmailSent(admin, {
        emailType: EmailTriggerType.WATCHLIST_PRICE_DROP,
        referenceId: `${watcher.user_id}:${listing.id}:${newPricePence}`,
        referenceType: "watchlist",
        recipientId: watcher.user_id,
        to: user.email,
        subject: `\uD83D\uDD25 Price drop! ${name} is now \u00A3${nowGbp}`,
        type: "standard",
        variables: {
          title: `Price drop: ${name}`,
          subtitle: `A club on your Watchlist just got cheaper.`,
          body: `Was: \u00A3${wasGbp}<br />Now: \u00A3${nowGbp}`,
          hero_image: listingHero(listing, name),
          cta_link: cta,
          cta_text: "View listing",
        },
      }).catch((e) => {
        console.error("watchlist price-drop email failed", e);
        return false;
      });

      if (ok) {
        sent += 1;
        await touchWatchlist(admin, watcher.id, {
          last_price_alert_at: new Date().toISOString(),
          last_price_alert_pence: newPricePence,
        });
        await trackServerEvent(admin, "watchlist_price_drop_sent", {
          userId: watcher.user_id,
          properties: { listing_id: listing.id, old_price: oldPricePence, new_price: newPricePence },
        });
      }

      await createNotification(admin, {
        userId: watcher.user_id,
        type: NotificationType.WATCHLIST_PRICE_DROP,
        title: `Price drop: ${name}`,
        message: `${name} is now £${nowGbp} (was £${wasGbp}).`,
        entityType: NotificationEntityType.LISTING,
        entityId: listing.id,
        actionUrl: `/listing/${listing.id}`,
        actionLabel: "View listing",
        requiresAction: false,
        metadata: { old_price: oldPricePence, new_price: newPricePence },
      });
    }

    return sent;
  } catch (e) {
    console.error("notifyWatchersOfPriceDrop failed", e);
    return 0;
  }
}

export async function notifyWatchersSold(
  admin: SupabaseClient,
  listingId: string,
  opts?: { skipUserId?: string | null }
): Promise<number> {
  try {
    const listing = await loadListing(admin, listingId);
    if (!listing) return 0;

    const watchers = await loadWatchers(admin, listingId);
    const users = await loadUsers(admin, watchers.map((w) => w.user_id));
    const name = clubLabel(listing.brand, listing.model, listing.title, listing.category);
    const cta = similarClubsAbsoluteUrl(listing.category, "watchlist_sold");
    const similarPath = similarClubsPath(listing.category);
    let sent = 0;

    for (const watcher of watchers) {
      if (opts?.skipUserId && watcher.user_id === opts.skipUserId) continue;
      if (watcher.last_sold_email_at) continue;
      const user = users.get(watcher.user_id);
      if (!user?.email || !canReceiveWatchlistEmail(user, "sold")) continue;

      const ok = await ensureEmailSent(admin, {
        emailType: EmailTriggerType.WATCHLIST_SOLD,
        referenceId: `${watcher.user_id}:${listing.id}:sold`,
        referenceType: "watchlist",
        recipientId: watcher.user_id,
        to: user.email,
        subject: `\uD83D\uDE22 ${name} has just sold`,
        type: "standard",
        variables: {
          title: `${name} has sold`,
          subtitle: "A club on your Watchlist is no longer available.",
          body: `The ${name} you were watching has just sold.<br /><br />Missed this one? Take a look at similar clubs currently available on Teevo.`,
          hero_image: listingHero(listing, name),
          cta_link: cta,
          cta_text: "Find similar clubs",
        },
      }).catch((e) => {
        console.error("watchlist sold email failed", e);
        return false;
      });

      if (ok) {
        sent += 1;
        await touchWatchlist(admin, watcher.id, {
          last_sold_email_at: new Date().toISOString(),
        });
        await trackServerEvent(admin, "watchlist_sold_sent", {
          userId: watcher.user_id,
          properties: { listing_id: listing.id },
        });
      }

      await createNotification(admin, {
        userId: watcher.user_id,
        type: NotificationType.WATCHLIST_SOLD,
        title: `${name} has sold`,
        message: `The ${name} you were watching has sold. Browse similar clubs on Teevo.`,
        entityType: NotificationEntityType.LISTING,
        entityId: listing.id,
        actionUrl: similarPath,
        actionLabel: "Find similar clubs",
        requiresAction: false,
      });
    }

    return sent;
  } catch (e) {
    console.error("notifyWatchersSold failed", e);
    return 0;
  }
}

export async function notifyWatchersUnavailable(
  admin: SupabaseClient,
  listingId: string,
  reason: "rejected" | "archived" | "deleted"
): Promise<number> {
  try {
    const listing = await loadListing(admin, listingId);
    if (!listing && reason !== "deleted") return 0;

    const watchers = await loadWatchers(admin, listingId);
    if (watchers.length === 0) return 0;

    const users = await loadUsers(admin, watchers.map((w) => w.user_id));
    const name = listing
      ? clubLabel(listing.brand, listing.model, listing.title, listing.category)
      : "A club";
    const category = listing?.category ?? null;
    const cta = similarClubsAbsoluteUrl(category, "watchlist_unavailable");
    const similarPath = similarClubsPath(category);
    let sent = 0;

    for (const watcher of watchers) {
      if (watcher.last_sold_email_at) continue;
      const user = users.get(watcher.user_id);
      if (!user?.email || !canReceiveWatchlistEmail(user, "unavailable")) continue;

      const ok = await ensureEmailSent(admin, {
        emailType: EmailTriggerType.WATCHLIST_UNAVAILABLE,
        referenceId: `${watcher.user_id}:${listingId}:unavailable`,
        referenceType: "watchlist",
        recipientId: watcher.user_id,
        to: user.email,
        subject: `\uD83D\uDC40 ${name} is no longer available`,
        type: "standard",
        variables: {
          title: `${name} is no longer available`,
          subtitle: "A club on your Watchlist has been removed.",
          body: `The ${name} you were watching is no longer available on Teevo.<br /><br />Take a look at similar clubs currently listed.`,
          hero_image: listing ? listingHero(listing, name) : "",
          cta_link: cta,
          cta_text: "Find similar clubs",
        },
      }).catch((e) => {
        console.error("watchlist unavailable email failed", e);
        return false;
      });

      if (ok) {
        sent += 1;
        await touchWatchlist(admin, watcher.id, {
          last_sold_email_at: new Date().toISOString(),
        });
      }

      await createNotification(admin, {
        userId: watcher.user_id,
        type: NotificationType.WATCHLIST_UNAVAILABLE,
        title: `${name} is no longer available`,
        message: `The ${name} you were watching is no longer available. Browse similar clubs on Teevo.`,
        entityType: NotificationEntityType.LISTING,
        entityId: listingId,
        actionUrl: similarPath,
        actionLabel: "Find similar clubs",
        requiresAction: false,
        metadata: { reason },
      });
    }

    return sent;
  } catch (e) {
    console.error("notifyWatchersUnavailable failed", e);
    return 0;
  }
}

export function reminderDelayMs(): number {
  const days = Number(process.env.WATCHLIST_REMINDER_DAYS ?? 3);
  const n = Number.isFinite(days) && days > 0 ? days : 3;
  return n * 24 * 60 * 60 * 1000;
}

export async function runWatchlistReminderCron(
  admin: SupabaseClient
): Promise<{ sent: number; scanned: number }> {
  const delayMs = reminderDelayMs();
  const cutoffIso = new Date(Date.now() - delayMs).toISOString();

  const { data: rows, error } = await admin
    .from("watchlist_items")
    .select(
      "id, user_id, listing_id, last_availability_email_at, last_now_available_email_at, created_at, listings(id, brand, model, title, category, price, status, archived_at, buying_paused, availability_confirmation_status, listing_images(storage_path, sort_order))"
    )
    .is("last_availability_email_at", null)
    .lte("created_at", cutoffIso)
    .limit(200);

  if (error) {
    console.error("runWatchlistReminderCron query failed", error);
    throw new Error(error.message);
  }

  const items = rows ?? [];
  let sent = 0;

  for (const row of items) {
    const listingRel = row.listings as unknown;
    const listing = (Array.isArray(listingRel) ? listingRel[0] : listingRel) as ListingRow | null;
    if (!listing || !listingPurchasable(listing)) continue;

    const startMs = Math.max(
      new Date(row.created_at).getTime(),
      row.last_now_available_email_at ? new Date(row.last_now_available_email_at).getTime() : 0
    );
    if (startMs > Date.now() - delayMs) continue;

    const { data: user } = await admin
      .from("users")
      .select("id, email")
      .eq("id", row.user_id)
      .maybeSingle();
    if (!user?.email || !canReceiveWatchlistEmail(user, "still_available")) continue;

    const name = clubLabel(listing.brand, listing.model, listing.title, listing.category);
    const cta = listingAbsoluteUrl(listing.id, "watchlist_reminder");

    const ok = await ensureEmailSent(admin, {
      emailType: EmailTriggerType.WATCHLIST_STILL_AVAILABLE,
      referenceId: `${row.user_id}:${listing.id}:still_available`,
      referenceType: "watchlist",
      recipientId: row.user_id,
      to: user.email,
      subject: `\uD83D\uDC40 Still thinking about ${name}?`,
      type: "standard",
      variables: {
        title: `Still thinking about ${name}?`,
        subtitle: "A club on your Watchlist is still available.",
        body: `Good news \u2014 the ${name} you added to your Watchlist is still available. If you\u2019ve been thinking about it, now might be the time.`,
        hero_image: listingHero(listing, name),
        cta_link: cta,
        cta_text: "View listing",
      },
    }).catch((e) => {
      console.error("watchlist still-available email failed", e);
      return false;
    });

    if (ok) {
      sent += 1;
      await touchWatchlist(admin, row.id, {
        last_availability_email_at: new Date().toISOString(),
      });
      await trackServerEvent(admin, "watchlist_reminder_sent", {
        userId: row.user_id,
        properties: { listing_id: listing.id },
      });
    }
  }

  return { sent, scanned: items.length };
}
