import type { SupabaseClient } from "@supabase/supabase-js";
import { creditBalanceFromRows } from "@/lib/referral/credit";
import { publicAvatarUrl } from "@/lib/seller-reviews";
import { getListingImageUrl } from "@/lib/listing-images";
import { getListingDisplayTitle } from "@/lib/listing-display";
import type { Listing } from "@/types/database";

export const ADMIN_USER_PAGE_SIZE = 25;

export function isCompletedTransaction(row: {
  status?: string | null;
  order_state?: string | null;
}): boolean {
  const status = (row.status ?? "").toLowerCase();
  const orderState = (row.order_state ?? "").toLowerCase();
  return (
    status === "complete" ||
    status === "completed" ||
    orderState === "completed" ||
    orderState === "complete"
  );
}

export function listingAdminLabel(row: {
  status?: string | null;
  buying_paused?: boolean | null;
  archived_at?: string | null;
}): string {
  if (row.archived_at) return "Removed";
  if (row.status === "sold") return "Sold";
  if (row.status === "rejected") return "Removed";
  if (row.buying_paused) return "Disabled";
  if (row.status === "pending") return "Coming Soon";
  if (row.status === "verified") return "Live";
  return row.status || "Unknown";
}

export function displayNameFromProfile(u: {
  first_name?: string | null;
  surname?: string | null;
  display_name?: string | null;
  email?: string | null;
}): string {
  const full = [u.first_name, u.surname].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (u.display_name?.trim()) return u.display_name.trim();
  return u.email || "Unknown user";
}

function one<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}

export type AdminUserListRow = {
  id: string;
  email: string;
  first_name: string | null;
  surname: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  stripe_account_id: string | null;
  created_at: string;
  account_status: string;
  founding_seller_rank: number | null;
  listing_count: number;
  active_listing_count: number;
  purchase_count: number;
  sale_count: number;
  credit_pence: number;
};

export async function enrichAdminUserList(
  admin: SupabaseClient,
  users: {
    id: string;
    email: string;
    first_name: string | null;
    surname: string | null;
    display_name?: string | null;
    avatar_path?: string | null;
    role: string;
    stripe_account_id: string | null;
    created_at: string;
    account_status?: string | null;
    founding_seller_rank?: number | null;
  }[]
): Promise<AdminUserListRow[]> {
  const ids = users.map((u) => u.id);
  const listingCount = new Map<string, { total: number; active: number }>();
  const purchaseCount = new Map<string, number>();
  const saleCount = new Map<string, number>();
  const creditByUser = new Map<
    string,
    { amount_pence: number; status: string; expires_at?: string | null }[]
  >();

  if (ids.length > 0) {
    const [{ data: listings }, { data: txs }, { data: credits }] = await Promise.all([
      admin.from("listings").select("user_id, status, archived_at").in("user_id", ids),
      admin
        .from("transactions")
        .select("buyer_id, seller_id, status, order_state")
        .or(`buyer_id.in.(${ids.join(",")}),seller_id.in.(${ids.join(",")})`),
      admin
        .from("credit_transactions")
        .select("user_id, amount_pence, status, expires_at")
        .in("user_id", ids),
    ]);

    for (const l of listings ?? []) {
      const uid = l.user_id as string;
      const cur = listingCount.get(uid) ?? { total: 0, active: 0 };
      cur.total += 1;
      if (!l.archived_at && (l.status === "pending" || l.status === "verified")) cur.active += 1;
      listingCount.set(uid, cur);
    }
    for (const t of txs ?? []) {
      if (!isCompletedTransaction(t)) continue;
      if (t.buyer_id) purchaseCount.set(t.buyer_id, (purchaseCount.get(t.buyer_id) ?? 0) + 1);
      if (t.seller_id) saleCount.set(t.seller_id, (saleCount.get(t.seller_id) ?? 0) + 1);
    }
    for (const c of credits ?? []) {
      const uid = c.user_id as string;
      const arr = creditByUser.get(uid) ?? [];
      arr.push(c);
      creditByUser.set(uid, arr);
    }
  }

  return users.map((u) => {
    const lc = listingCount.get(u.id) ?? { total: 0, active: 0 };
    return {
      id: u.id,
      email: u.email,
      first_name: u.first_name,
      surname: u.surname,
      display_name: u.display_name ?? null,
      avatar_url: publicAvatarUrl(u.avatar_path),
      role: u.role,
      stripe_account_id: u.stripe_account_id,
      created_at: u.created_at,
      account_status: u.account_status ?? "active",
      founding_seller_rank: u.founding_seller_rank ?? null,
      listing_count: lc.total,
      active_listing_count: lc.active,
      purchase_count: purchaseCount.get(u.id) ?? 0,
      sale_count: saleCount.get(u.id) ?? 0,
      credit_pence: creditBalanceFromRows(creditByUser.get(u.id) ?? []),
    };
  });
}

export type AdminUserDetail = {
  id: string;
  email: string;
  first_name: string | null;
  surname: string | null;
  display_name: string | null;
  phone: string | null;
  avatar_path: string | null;
  avatar_url: string | null;
  role: string;
  stripe_account_id: string | null;
  created_at: string;
  updated_at: string | null;
  account_status: string;
  suspended_at: string | null;
  suspended_by: string | null;
  suspension_reason: string | null;
  founding_seller_rank: number | null;
  founder_joined_at: string | null;
  founder_reward_status: string | null;
  founder_reward_earned_at: string | null;
  rating_average: number | null;
  rating_count: number;
  email_confirmed: boolean;
  listing_count: number;
  sale_count: number;
  purchase_count: number;
  credit_pence: number;
};

export async function getAdminUserDetail(
  admin: SupabaseClient,
  userId: string
): Promise<AdminUserDetail | null> {
  const { data: profile } = await admin
    .from("users")
    .select(
      "id, email, first_name, surname, display_name, phone, avatar_path, role, stripe_account_id, created_at, updated_at, account_status, suspended_at, suspended_by, suspension_reason, founding_seller_rank, founder_joined_at, founder_reward_status, founder_reward_earned_at, rating_average, rating_count"
    )
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return null;

  const { data: authData } = await admin.auth.admin.getUserById(userId);
  const emailConfirmed = Boolean(authData.user?.email_confirmed_at);

  const [{ count: listingCount }, { data: sales }, { data: purchases }, { data: credits }] =
    await Promise.all([
      admin.from("listings").select("id", { count: "exact", head: true }).eq("user_id", userId),
      admin.from("transactions").select("id, status, order_state").eq("seller_id", userId),
      admin.from("transactions").select("id, status, order_state").eq("buyer_id", userId),
      admin.from("credit_transactions").select("amount_pence, status, expires_at").eq("user_id", userId),
    ]);

  return {
    id: profile.id,
    email: profile.email,
    first_name: profile.first_name,
    surname: profile.surname,
    display_name: profile.display_name,
    phone: profile.phone ?? null,
    avatar_path: profile.avatar_path,
    avatar_url: publicAvatarUrl(profile.avatar_path),
    role: profile.role,
    stripe_account_id: profile.stripe_account_id,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
    account_status: profile.account_status ?? "active",
    suspended_at: profile.suspended_at ?? null,
    suspended_by: profile.suspended_by ?? null,
    suspension_reason: profile.suspension_reason ?? null,
    founding_seller_rank: profile.founding_seller_rank ?? null,
    founder_joined_at: profile.founder_joined_at ?? null,
    founder_reward_status: profile.founder_reward_status ?? null,
    founder_reward_earned_at: profile.founder_reward_earned_at ?? null,
    rating_average: profile.rating_average ?? null,
    rating_count: profile.rating_count ?? 0,
    email_confirmed: emailConfirmed,
    listing_count: listingCount ?? 0,
    sale_count: (sales ?? []).filter(isCompletedTransaction).length,
    purchase_count: (purchases ?? []).filter(isCompletedTransaction).length,
    credit_pence: creditBalanceFromRows(credits ?? []),
  };
}

export async function getAdminUserListings(
  admin: SupabaseClient,
  userId: string,
  offset = 0,
  limit = ADMIN_USER_PAGE_SIZE
) {
  const { data, error, count } = await admin
    .from("listings")
    .select(
      "id, user_id, category, brand, model, title, price, status, created_at, buying_paused, archived_at, listing_images(storage_path, sort_order)",
      { count: "exact" }
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(error.message);
  const rows = (data ?? []).map((row) => {
    const images = [
      ...((row.listing_images as { storage_path: string; sort_order: number }[]) ?? []),
    ].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const imageUrl = images[0]?.storage_path
      ? getListingImageUrl(images[0].storage_path, "thumb")
      : null;
    return {
      id: row.id as string,
      category: row.category as string,
      brand: row.brand as string,
      model: row.model as string | null,
      title: getListingDisplayTitle(row as unknown as Listing),
      price: row.price as number,
      status: row.status as string,
      status_label: listingAdminLabel(row),
      created_at: row.created_at as string,
      buying_paused: Boolean(row.buying_paused),
      archived_at: (row.archived_at as string | null) ?? null,
      image_url: imageUrl,
    };
  });
  return { rows, total: count ?? rows.length };
}

export async function getAdminUserTransactions(
  admin: SupabaseClient,
  userId: string,
  role: "buyer" | "seller",
  offset = 0,
  limit = ADMIN_USER_PAGE_SIZE
) {
  const col = role === "buyer" ? "buyer_id" : "seller_id";
  const { data, error, count } = await admin
    .from("transactions")
    .select(
      "id, listing_id, buyer_id, seller_id, amount, status, order_state, fulfilment_status, shipping_fee_gbp, credit_redeemed_pence, created_at, listing:listings(id, brand, model, title)",
      { count: "exact" }
    )
    .eq(col, userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(error.message);

  const rowsRaw = (data ?? []) as Record<string, unknown>[];
  const otherIds = Array.from(
    new Set(rowsRaw.flatMap((r) => [r.buyer_id as string, r.seller_id as string]).filter(Boolean))
  );
  const usersById: Record<string, { email: string | null; first_name: string | null; surname: string | null }> =
    {};
  if (otherIds.length) {
    const { data: users } = await admin
      .from("users")
      .select("id, email, first_name, surname")
      .in("id", otherIds);
    for (const u of users ?? []) usersById[u.id] = u;
  }

  const rows = rowsRaw.map((row) => {
    const listing = one(
      row.listing as { id?: string; brand?: string; model?: string | null; title?: string | null } | null
    );
    const buyer = usersById[row.buyer_id as string];
    const seller = usersById[row.seller_id as string];
    return {
      id: row.id as string,
      listing_id: row.listing_id as string,
      listing_title: listing ? getListingDisplayTitle(listing as unknown as Listing) : "Listing",
      buyer_id: row.buyer_id as string,
      seller_id: row.seller_id as string,
      buyer_email: buyer?.email ?? null,
      seller_email: seller?.email ?? null,
      amount: row.amount as number,
      shipping_fee_gbp: (row.shipping_fee_gbp as number | null) ?? null,
      credit_redeemed_pence: (row.credit_redeemed_pence as number | null) ?? 0,
      status: row.status as string,
      order_state: (row.order_state as string | null) ?? null,
      fulfilment_status: (row.fulfilment_status as string | null) ?? null,
      created_at: row.created_at as string,
    };
  });
  return { rows, total: count ?? rows.length };
}

export async function getAdminUserRewards(admin: SupabaseClient, userId: string) {
  const now = new Date();
  const [{ data: credits }, { data: codes }, { data: referrals }] = await Promise.all([
    admin
      .from("credit_transactions")
      .select("amount_pence, status, expires_at, type, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    admin.from("referral_codes").select("id, code, status, kind").eq("owner_user_id", userId),
    admin
      .from("referrals")
      .select("id, referred_user_id, created_at")
      .eq("referrer_user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const creditRows = credits ?? [];
  const available = creditBalanceFromRows(creditRows, now);
  let earned = 0;
  let spent = 0;
  let expired = 0;
  for (const row of creditRows) {
    if (row.type === "redemption") spent += Math.abs(row.amount_pence as number);
    if (
      row.status === "available" &&
      row.expires_at &&
      new Date(row.expires_at as string) <= now
    ) {
      expired += row.amount_pence as number;
    }
    if (
      (row.amount_pence as number) > 0 &&
      (row.status === "available" || row.status === "redeemed")
    ) {
      earned += row.amount_pence as number;
    }
  }

  const referralIds = (referrals ?? []).map((r) => r.id);
  const referredIds = (referrals ?? []).map((r) => r.referred_user_id);
  type RewardRow = {
    id: string;
    referral_id: string;
    reward_type: string;
    amount_pence: number;
    status: string;
    created_at: string;
  };
  let rewards: RewardRow[] = [];
  if (referralIds.length > 0) {
    const { data } = await admin
      .from("referral_rewards")
      .select("id, referral_id, reward_type, amount_pence, status, created_at")
      .in("referral_id", referralIds);
    rewards = (data ?? []) as RewardRow[];
  }
  const { data: referredUsers } =
    referredIds.length > 0
      ? await admin
          .from("users")
          .select("id, email, first_name, surname, display_name")
          .in("id", referredIds)
      : {
          data: [] as {
            id: string;
            email: string;
            first_name: string | null;
            surname: string | null;
            display_name: string | null;
          }[],
        };
  const usersById = new Map((referredUsers ?? []).map((u) => [u.id, u]));
  const rewardsByReferral = new Map<string, RewardRow[]>();
  for (const rw of rewards) {
    const list = rewardsByReferral.get(rw.referral_id) ?? [];
    list.push(rw);
    rewardsByReferral.set(rw.referral_id, list);
  }

  const referralRows = (referrals ?? []).map((r) => {
    const u = usersById.get(r.referred_user_id);
    const rws = rewardsByReferral.get(r.id) ?? [];
    const awarded = rws.find((x) => x.status === "approved" || x.status === "paid");
    const pending = rws.some((x) => x.status === "pending");
    return {
      user_id: r.referred_user_id as string,
      user_name: u ? displayNameFromProfile(u) : String(r.referred_user_id).slice(0, 8),
      trigger: awarded?.reward_type ?? rws[0]?.reward_type ?? "Referral",
      reward_pence: awarded?.amount_pence ?? null,
      status: awarded ? "Awarded" : pending ? "Pending" : rws[0]?.status ?? "Pending",
    };
  });

  return {
    available_pence: available,
    earned_pence: earned,
    spent_pence: spent,
    expired_pence: expired,
    referral_codes: codes ?? [],
    referred_count: referrals?.length ?? 0,
    successful_referrals: referralRows.filter((r) => r.status === "Awarded").length,
    pending_referrals: referralRows.filter((r) => r.status === "Pending").length,
    referrals: referralRows,
  };
}

export type ActivityItem = {
  id: string;
  at: string;
  title: string;
  detail: string | null;
};

export async function getAdminUserActivity(
  admin: SupabaseClient,
  userId: string,
  createdAt: string,
  offset = 0,
  limit = 50
): Promise<{ rows: ActivityItem[]; total: number }> {
  const [{ data: listings }, { data: txs }, { data: credits }, { data: reviews }, { data: actions }] =
    await Promise.all([
      admin
        .from("listings")
        .select("id, brand, model, title, status, created_at, updated_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
      admin
        .from("transactions")
        .select(
          "id, buyer_id, seller_id, amount, status, order_state, created_at, completed_at, listing:listings(brand, model, title)"
        )
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(100),
      admin
        .from("credit_transactions")
        .select("id, amount_pence, type, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
      admin
        .from("seller_reviews")
        .select("id, rating, created_at, buyer_id, seller_id")
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(50),
      admin
        .from("admin_actions")
        .select("id, action, created_at, payload")
        .eq("target_type", "user")
        .eq("target_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  const items: ActivityItem[] = [
    { id: `created-${userId}`, at: createdAt, title: "Account created", detail: null },
  ];
  for (const l of listings ?? []) {
    const title = getListingDisplayTitle(l as unknown as Listing);
    items.push({ id: `listing-${l.id}`, at: l.created_at, title: "Created listing", detail: title });
    if (l.status === "verified") {
      items.push({
        id: `listing-verified-${l.id}`,
        at: l.updated_at ?? l.created_at,
        title: "Listing verified",
        detail: title,
      });
    }
    if (l.status === "sold") {
      items.push({
        id: `listing-sold-${l.id}`,
        at: l.updated_at ?? l.created_at,
        title: "Listing sold",
        detail: title,
      });
    }
  }
  for (const t of txs ?? []) {
    const listing = one(
      t.listing as { brand?: string; model?: string | null; title?: string | null } | null
    );
    const title = listing ? getListingDisplayTitle(listing as unknown as Listing) : "Order";
    const isSeller = t.seller_id === userId;
    if (isCompletedTransaction(t)) {
      items.push({
        id: `tx-${t.id}`,
        at: (t.completed_at as string) || t.created_at,
        title: isSeller ? "Sale completed" : "Purchase completed",
        detail: title,
      });
    } else {
      items.push({
        id: `tx-created-${t.id}`,
        at: t.created_at,
        title: isSeller ? "Sale started" : "Purchase started",
        detail: title,
      });
    }
  }
  for (const c of credits ?? []) {
    if (c.amount_pence > 0 && (c.status === "available" || c.status === "redeemed")) {
      items.push({
        id: `credit-${c.id}`,
        at: c.created_at,
        title: "Credit awarded",
        detail: `£${(c.amount_pence / 100).toFixed(2)} Teevo credit`,
      });
    }
  }
  for (const r of reviews ?? []) {
    items.push({
      id: `review-${r.id}`,
      at: r.created_at,
      title: r.seller_id === userId ? "Review received" : "Review submitted",
      detail: `${r.rating}★`,
    });
  }
  for (const a of actions ?? []) {
    items.push({
      id: `admin-${a.id}`,
      at: a.created_at,
      title: String(a.action).replace(/_/g, " "),
      detail: null,
    });
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return { rows: items.slice(offset, offset + limit), total: items.length };
}

export async function getAdminUserNotes(admin: SupabaseClient, userId: string) {
  const { data, error } = await admin
    .from("admin_user_notes")
    .select("id, body, admin_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const adminIds = Array.from(new Set((data ?? []).map((n) => n.admin_id)));
  const names = new Map<string, string>();
  if (adminIds.length) {
    const { data: users } = await admin
      .from("users")
      .select("id, first_name, surname, email")
      .in("id", adminIds);
    for (const u of users ?? []) names.set(u.id, displayNameFromProfile(u));
  }
  return (data ?? []).map((n) => ({
    ...n,
    admin_name: names.get(n.admin_id) ?? "Admin",
  }));
}

export async function getAdminUserAudit(admin: SupabaseClient, userId: string) {
  const { data, error } = await admin
    .from("admin_actions")
    .select("id, admin_id, action, payload, created_at")
    .eq("target_type", "user")
    .eq("target_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return data ?? [];
}
