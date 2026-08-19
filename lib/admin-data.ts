/**
 * Server-only admin data helpers. Use from admin layout-protected server components only.
 * Uses service role; auth is enforced by admin layout.
 */
import { createClient } from "@supabase/supabase-js";
import { generateDisplayNameFromFirstName } from "@/lib/public-seller-name";
import { getListingWatchCounts } from "@/lib/watchlist";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export type AdminUser = {
  id: string;
  email: string;
  first_name: string | null;
  surname: string | null;
  role: string;
  stripe_account_id: string | null;
  created_at: string;
};

export async function getAdminUsers(): Promise<AdminUser[]> {
  const admin = adminClient();
  const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const authIds = new Set((authUsers?.users ?? []).map((u) => u.id));
  const now = new Date().toISOString();
  for (const authUser of authUsers?.users ?? []) {
    const id = authUser.id;
    const email = authUser.email ?? "";
    const { data: existing } = await admin.from("users").select("id").eq("id", id).single();
    if (existing) {
      await admin.from("users").update({ email, updated_at: now }).eq("id", id);
    } else {
      await admin.from("users").insert({
        id,
        email,
        role: "buyer",
        display_name: generateDisplayNameFromFirstName(null),
        updated_at: now,
      });
    }
  }
  const { data, error } = await admin
    .from("users")
    .select("id, email, first_name, surname, role, stripe_account_id, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  return rows.filter((u) => authIds.has(u.id));
}

export type PendingListing = {
  id: string;
  user_id: string;
  category: string;
  brand: string;
  model: string | null;
  title: string | null;
  condition: string;
  price: number;
  description: string | null;
  status: string;
  created_at: string;
  item_type: string | null;
  size: string | null;
  colour: string | null;
  created_on_behalf?: boolean;
  created_by_admin_id?: string | null;
  seller_email?: string | null;
  listing_images?: { storage_path: string; sort_order: number }[];
};

export async function getPendingListings(): Promise<PendingListing[]> {
  const admin = adminClient();
  const { data, error } = await admin
    .from("listings")
    .select("id, user_id, category, brand, model, title, condition, price, description, status, created_at, item_type, size, colour, created_on_behalf, created_by_admin_id, listing_images(storage_path, sort_order)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as PendingListing[];
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  let emailByUserId: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: users } = await admin.from("users").select("id, email").in("id", userIds);
    emailByUserId = (users ?? []).reduce((acc: Record<string, string>, u: { id: string; email: string }) => {
      acc[u.id] = u.email;
      return acc;
    }, {});
  }
  return rows.map((r) => ({ ...r, seller_email: emailByUserId[r.user_id] ?? null }));
}

export type AllListing = {
  id: string;
  user_id: string;
  category: string;
  brand: string;
  model: string | null;
  title: string | null;
  condition: string;
  price: number;
  status: string;
  created_at: string;
  item_type: string | null;
  size: string | null;
  colour: string | null;
  seller_email: string | null;
  created_on_behalf?: boolean;
  created_by_admin_id?: string | null;
  watch_count: number;
  buying_paused?: boolean;
  availability_confirmation_status?: string | null;
  availability_confirmation_source?: string | null;
  availability_confirmation_requested_at?: string | null;
  availability_confirmed_at?: string | null;
  availability_confirmation_batch_id?: string | null;
  archived_at?: string | null;
  review_count: number;
};

export async function getAllListings(opts: {
  q?: string;
  status?: string;
  createdBefore?: string;
  buying?: string;
  availability?: string;
}): Promise<AllListing[]> {
  const admin = adminClient();
  let query = admin
    .from("listings")
    .select("id, user_id, category, brand, model, title, condition, price, status, created_at, item_type, size, colour, created_on_behalf, created_by_admin_id, buying_paused, availability_confirmation_status, availability_confirmation_source, availability_confirmation_requested_at, availability_confirmed_at, availability_confirmation_batch_id, archived_at, review_count")
    .order("created_at", { ascending: false });
  if (opts.status && ["pending", "verified", "rejected", "sold"].includes(opts.status)) {
    query = query.eq("status", opts.status);
  }
  if (opts.createdBefore?.trim()) {
    const day = opts.createdBefore.trim();
    const end = day.includes("T") ? day : `${day}T23:59:59.999Z`;
    query = query.lte("created_at", end);
  }
  if (opts.buying === "paused") {
    query = query.eq("buying_paused", true);
  } else if (opts.buying === "purchasable") {
    query = query.eq("buying_paused", false);
  }
  if (opts.availability === "never") {
    query = query.is("availability_confirmation_status", null);
  } else if (
    opts.availability &&
    ["required", "confirmed_available", "confirmed_unavailable", "expired"].includes(opts.availability)
  ) {
    query = query.eq("availability_confirmation_status", opts.availability);
  }
  if (opts.q?.trim()) {
    const term = opts.q.trim();
    query = query.or(
      `model.ilike.%${term}%,brand.ilike.%${term}%,description.ilike.%${term}%,title.ilike.%${term}%,item_type.ilike.%${term}%,size.ilike.%${term}%`
    );
  }
  const { data: listings, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (listings ?? []) as { user_id: string; [k: string]: unknown }[];
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  let emailByUserId: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: users } = await admin.from("users").select("id, email").in("id", userIds);
    emailByUserId = (users ?? []).reduce((acc: Record<string, string>, u: { id: string; email: string }) => {
      acc[u.id] = u.email;
      return acc;
    }, {});
  }
  const listingIds = rows.map((r) => r.id as string);
  const watchCounts = await getListingWatchCounts(admin, listingIds);
  return rows.map((r) => ({
    ...r,
    seller_email: emailByUserId[r.user_id] ?? null,
    watch_count: watchCounts[r.id as string] ?? 0,
  })) as AllListing[];
}

export type AdminTransaction = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  status: string;
  shipped_at: string | null;
  completed_at: string | null;
  created_at: string;
  packaging_source?: string | null;
  starter_pack_dispatched_at?: string | null;
  dispatch_deadline_at?: string | null;
  cancellation_status?: string | null;
  listing?: { model: string };
};

export async function getAdminTransactions(status?: string): Promise<AdminTransaction[]> {
  const admin = adminClient();
  let query = admin
    .from("transactions")
    .select("id, listing_id, buyer_id, seller_id, amount, status, shipped_at, completed_at, created_at, packaging_source, starter_pack_dispatched_at, dispatch_deadline_at, cancellation_status, listing:listings(model)")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Record<string, unknown>[];
  return rows.map((row) => ({
    ...row,
    listing: Array.isArray(row.listing) ? row.listing[0] : row.listing,
  })) as AdminTransaction[];
}

export type AdminTransactionDetail = Record<string, unknown> & {
  id: string;
  listing?: { id: string; model: string | null; title: string | null; status: string; availability_confirmation_status: string | null } | null;
  buyer?: { email: string | null } | null;
  seller?: { email: string | null } | null;
};

export async function getAdminTransactionDetail(id: string): Promise<AdminTransactionDetail | null> {
  const admin = adminClient();
  const { data, error } = await admin
    .from("transactions")
    .select(
      "id, listing_id, buyer_id, seller_id, amount, status, order_state, fulfilment_status, fulfilment_mode, shipped_at, delivered_at, completed_at, buyer_confirmed_at, created_at, stripe_payment_id, stripe_refund_id, original_dispatch_deadline_at, dispatch_deadline_at, dispatch_clock_paused_at, dispatch_clock_pause_reason, dispatch_extension_status, dispatch_extension_requested_at, dispatch_extension_responded_at, dispatch_extension_responded_by, dispatch_extension_business_days, dispatch_reminder_after_purchase_sent_at, dispatch_reminder_one_day_sent_at, dispatch_reminder_final_sent_at, cancellation_reason, cancellation_status, cancelled_at, packaging_status, packaging_source, packaging_requested_at, packaging_photos, shipping_package, starter_pack_dispatched_at, shipping_label_url, shippo_label_url, label_created_at, shippo_transaction_id, listing:listings(id, model, title, status, availability_confirmation_status), buyer:users!transactions_buyer_id_fkey(email), seller:users!transactions_seller_id_fkey(email)"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) {
    const { data: fallback, error: fallbackErr } = await admin
      .from("transactions")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (fallbackErr || !fallback) return null;
    const { data: listing } = await admin
      .from("listings")
      .select("id, model, title, status, availability_confirmation_status")
      .eq("id", fallback.listing_id)
      .maybeSingle();
    const { data: buyer } = await admin.from("users").select("email").eq("id", fallback.buyer_id).maybeSingle();
    const { data: seller } = await admin.from("users").select("email").eq("id", fallback.seller_id).maybeSingle();
    return { ...fallback, listing, buyer, seller };
  }
  if (!data) return null;
  const row = data as Record<string, unknown>;
  return {
    ...row,
    listing: Array.isArray(row.listing) ? row.listing[0] : row.listing,
    buyer: Array.isArray(row.buyer) ? row.buyer[0] : row.buyer,
    seller: Array.isArray(row.seller) ? row.seller[0] : row.seller,
  } as AdminTransactionDetail;
}

export async function getTransactionEvents(transactionId: string): Promise<
  { id: string; event_type: string; actor_id: string | null; payload: Record<string, unknown>; created_at: string }[]
> {
  const admin = adminClient();
  const { data, error } = await admin
    .from("transaction_events")
    .select("id, event_type, actor_id, payload, created_at")
    .eq("transaction_id", transactionId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return [];
  return (data ?? []) as {
    id: string;
    event_type: string;
    actor_id: string | null;
    payload: Record<string, unknown>;
    created_at: string;
  }[];
}

