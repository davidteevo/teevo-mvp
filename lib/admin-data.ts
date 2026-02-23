/**
 * Server-only admin data helpers. Use from admin layout-protected server components only.
 * Uses service role; auth is enforced by admin layout.
 */
import { createClient } from "@supabase/supabase-js";

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
  role: string;
  stripe_account_id: string | null;
  created_at: string;
};

export async function getAdminUsers(): Promise<AdminUser[]> {
  const admin = adminClient();
  const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const now = new Date().toISOString();
  for (const authUser of authUsers?.users ?? []) {
    const id = authUser.id;
    const email = authUser.email ?? "";
    const { data: existing } = await admin.from("users").select("id").eq("id", id).single();
    if (existing) {
      await admin.from("users").update({ email, updated_at: now }).eq("id", id);
    } else {
      await admin.from("users").insert({ id, email, role: "buyer", updated_at: now });
    }
  }
  const { data, error } = await admin
    .from("users")
    .select("id, email, role, stripe_account_id, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type PendingListing = {
  id: string;
  user_id: string;
  category: string;
  brand: string;
  model: string;
  condition: string;
  price: number;
  description: string | null;
  status: string;
  created_at: string;
  listing_images?: { storage_path: string; sort_order: number }[];
};

export async function getPendingListings(): Promise<PendingListing[]> {
  const admin = adminClient();
  const { data, error } = await admin
    .from("listings")
    .select("id, user_id, category, brand, model, condition, price, description, status, created_at, listing_images(storage_path, sort_order)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PendingListing[];
}

export type AllListing = {
  id: string;
  user_id: string;
  category: string;
  brand: string;
  model: string;
  condition: string;
  price: number;
  status: string;
  created_at: string;
  seller_email: string | null;
};

export async function getAllListings(opts: { q?: string; status?: string }): Promise<AllListing[]> {
  const admin = adminClient();
  let query = admin
    .from("listings")
    .select("id, user_id, category, brand, model, condition, price, status, created_at")
    .order("created_at", { ascending: false });
  if (opts.status && ["pending", "verified", "rejected", "sold"].includes(opts.status)) {
    query = query.eq("status", opts.status);
  }
  if (opts.q?.trim()) {
    query = query.or(`model.ilike.%${opts.q.trim()}%,brand.ilike.%${opts.q.trim()}%,description.ilike.%${opts.q.trim()}%`);
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
  return rows.map((r) => ({
    ...r,
    seller_email: emailByUserId[r.user_id] ?? null,
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
  listing?: { model: string };
};

export async function getAdminTransactions(status?: string): Promise<AdminTransaction[]> {
  const admin = adminClient();
  let query = admin
    .from("transactions")
    .select("id, listing_id, buyer_id, seller_id, amount, status, shipped_at, completed_at, created_at, listing:listings(model)")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminTransaction[];
}
