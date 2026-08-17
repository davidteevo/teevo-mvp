import type { SupabaseClient } from "@supabase/supabase-js";
import { getAppUrl } from "@/lib/app-env";
import { isPurchasableListingStatus } from "@/lib/listing-availability";
import { normalizeListingTitleForCategory } from "@/lib/listing-categories";

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type WatchlistEmailKind =
  | "still_available"
  | "now_available"
  | "price_drop"
  | "sold"
  | "unavailable";

/**
 * Preference seam. Always true until a notification preference centre exists.
 * All Watchlist emails must go through this helper.
 */
export function canReceiveWatchlistEmail(
  _user: { id?: string | null } | null | undefined,
  _kind: WatchlistEmailKind
): boolean {
  return true;
}

export function isWatchListingId(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function parseWatchListingId(urlOrPath: string): string | null {
  try {
    const u = urlOrPath.startsWith("http")
      ? new URL(urlOrPath)
      : new URL(urlOrPath, "http://local.invalid");
    const watch = u.searchParams.get("watch");
    return isWatchListingId(watch) ? watch : null;
  } catch {
    return null;
  }
}

export function stripWatchParam(path: string): string {
  try {
    const u = new URL(path, "http://local.invalid");
    u.searchParams.delete("watch");
    const qs = u.searchParams.toString();
    return `${u.pathname}${qs ? `?${qs}` : ""}${u.hash}`;
  } catch {
    return path;
  }
}

export function watchRedirectPath(listingId: string, returnPath?: string | null): string {
  const base =
    returnPath && returnPath.startsWith("/") && !returnPath.startsWith("//")
      ? returnPath
      : `/listing/${listingId}`;
  try {
    const u = new URL(base, "http://local.invalid");
    u.searchParams.set("watch", listingId);
    return `${u.pathname}?${u.searchParams.toString()}`;
  } catch {
    return `/listing/${listingId}?watch=${listingId}`;
  }
}

export function listingAbsoluteUrl(listingId: string, src?: string): string {
  const appUrl = getAppUrl();
  const qs = src ? `?src=${encodeURIComponent(src)}` : "";
  return `${appUrl}/listing/${listingId}${qs}`;
}

export function similarClubsPath(category?: string | null): string {
  if (category?.trim()) return `/?category=${encodeURIComponent(category.trim())}`;
  return "/";
}

export function similarClubsAbsoluteUrl(category?: string | null, src?: string): string {
  const appUrl = getAppUrl();
  const path = similarClubsPath(category);
  if (!src) return `${appUrl}${path}`;
  const join = path.includes("?") ? "&" : "?";
  return `${appUrl}${path}${join}src=${encodeURIComponent(src)}`;
}

export function clubLabel(
  brand?: string | null,
  model?: string | null,
  title?: string | null,
  category?: string | null
): string {
  if (title?.trim()) return normalizeListingTitleForCategory(title.trim(), category);
  const named = [brand, model].filter(Boolean).join(" ").trim();
  return named || "this club";
}

export type AddWatchlistResult =
  | { ok: true; created: boolean }
  | { error: string; httpStatus: number };

export async function addWatchlistItem(
  admin: SupabaseClient,
  userId: string,
  listingId: string
): Promise<AddWatchlistResult> {
  if (!isWatchListingId(listingId)) {
    return { error: "Invalid listing", httpStatus: 400 };
  }

  const { data: listing, error } = await admin
    .from("listings")
    .select("id, user_id, price, status, archived_at")
    .eq("id", listingId)
    .maybeSingle();

  if (error) return { error: error.message, httpStatus: 500 };
  if (!listing) return { error: "Listing not found", httpStatus: 404 };
  if (listing.user_id === userId) {
    return { error: "You can't watch your own listing", httpStatus: 400 };
  }
  if (listing.archived_at || listing.status === "rejected" || listing.status === "sold") {
    return { error: "This listing is no longer available to watch", httpStatus: 400 };
  }
  if (listing.status !== "pending" && !isPurchasableListingStatus(listing.status)) {
    return { error: "Listing not found", httpStatus: 404 };
  }

  const { data: existing } = await admin
    .from("watchlist_items")
    .select("id")
    .eq("user_id", userId)
    .eq("listing_id", listingId)
    .maybeSingle();
  if (existing) return { ok: true, created: false };

  const { error: insertError } = await admin.from("watchlist_items").insert({
    user_id: userId,
    listing_id: listingId,
    watched_price_pence: listing.price,
    updated_at: new Date().toISOString(),
  });

  if (insertError) {
    if (insertError.code === "23505") return { ok: true, created: false };
    return { error: insertError.message, httpStatus: 500 };
  }

  return { ok: true, created: true };
}

export async function removeWatchlistItem(
  admin: SupabaseClient,
  userId: string,
  listingId: string
): Promise<{ ok: true } | { error: string; httpStatus: number }> {
  if (!isWatchListingId(listingId)) {
    return { error: "Invalid listing", httpStatus: 400 };
  }
  const { error } = await admin
    .from("watchlist_items")
    .delete()
    .eq("user_id", userId)
    .eq("listing_id", listingId);
  if (error) return { error: error.message, httpStatus: 500 };
  return { ok: true };
}

export async function getListingWatchCount(
  admin: SupabaseClient,
  listingId: string
): Promise<number> {
  const { count, error } = await admin
    .from("watchlist_items")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId);
  if (error) {
    console.error("getListingWatchCount failed", error);
    return 0;
  }
  return count ?? 0;
}

export async function getListingWatchCounts(
  admin: SupabaseClient,
  listingIds: string[]
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const id of listingIds) counts[id] = 0;
  if (listingIds.length === 0) return counts;

  const { data, error } = await admin.from("watchlist_items").select("listing_id").in("listing_id", listingIds);
  if (error) {
    console.error("getListingWatchCounts failed", error);
    return counts;
  }
  for (const row of data ?? []) {
    counts[row.listing_id] = (counts[row.listing_id] ?? 0) + 1;
  }
  return counts;
}
