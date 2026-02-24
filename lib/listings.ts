import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ListingCategory } from "@/types/database";

interface Filters {
  category?: string;
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
}

const LISTINGS_GRID_LIMIT = 60;
const LISTINGS_CACHE_SECONDS = 45;
const LISTING_DETAIL_CACHE_SECONDS = 30;

async function getVerifiedListingsUncached(filters?: Filters) {
  const supabase = await createClient();
  let query = supabase
    .from("listings")
    .select(
      "id, user_id, category, brand, model, condition, description, price, status, flagged, created_at, updated_at, listing_images ( id, storage_path, sort_order )"
    )
    .eq("status", "verified")
    .order("created_at", { ascending: false })
    .limit(LISTINGS_GRID_LIMIT);

  if (filters?.category) {
    query = query.eq("category", filters.category as ListingCategory);
  }
  if (filters?.brand) {
    query = query.eq("brand", filters.brand);
  }
  if (filters?.minPrice) {
    const pence = Math.round(parseFloat(filters.minPrice) * 100);
    if (!Number.isNaN(pence)) query = query.gte("price", pence);
  }
  if (filters?.maxPrice) {
    const pence = Math.round(parseFloat(filters.maxPrice) * 100);
    if (!Number.isNaN(pence)) query = query.lte("price", pence);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export function getVerifiedListings(filters?: Filters) {
  const key = ["verified-listings", filters?.category ?? "", filters?.brand ?? "", filters?.minPrice ?? "", filters?.maxPrice ?? ""].join("-");
  return unstable_cache(
    () => getVerifiedListingsUncached(filters),
    [key],
    { revalidate: LISTINGS_CACHE_SECONDS }
  )();
}

async function getListingByIdUncached(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select("id, user_id, category, brand, model, condition, description, price, status, created_at, listing_images ( id, storage_path, sort_order )")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export function getListingById(id: string) {
  return unstable_cache(
    () => getListingByIdUncached(id),
    ["listing", id],
    { revalidate: LISTING_DETAIL_CACHE_SECONDS }
  )();
}

/** Fetch listing by id with service role (e.g. for buyer viewing a purchased/sold listing). */
async function getListingByIdAdminUncached(id: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("listings")
    .select("id, user_id, category, brand, model, condition, description, price, status, created_at, listing_images ( id, storage_path, sort_order )")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export function getListingByIdAdmin(id: string) {
  return unstable_cache(
    () => getListingByIdAdminUncached(id),
    ["listing-admin", id],
    { revalidate: LISTING_DETAIL_CACHE_SECONDS }
  )();
}
