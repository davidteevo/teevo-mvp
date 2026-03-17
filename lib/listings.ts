import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ListingCategory } from "@/types/database";

export interface Filters {
  category?: string;
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
  search?: string;
  shaft?: string;
  shaftFlex?: string;
  degree?: string;
  handed?: string;
  item_type?: string;
  size?: string;
}

const LISTINGS_GRID_LIMIT = 60;
const LISTINGS_CACHE_SECONDS = 45;
const LISTING_DETAIL_CACHE_SECONDS = 30;

/** Escape term for use in ilike (%, _ are wildcards in SQL LIKE). */
function escapeLike(term: string): string {
  return term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** Uses admin client so this can run inside unstable_cache without request/cookies (e.g. on Netlify). Only returns public verified listings. */
async function getVerifiedListingsUncached(filters?: Filters) {
  const supabase = createAdminClient();
  let query = supabase
    .from("listings")
    .select(
      "id, user_id, category, brand, model, title, condition, description, price, shaft, degree, shaft_flex, handed, item_type, size, colour, status, flagged, created_at, updated_at, listing_images ( id, storage_path, sort_order ), users ( display_name )"
    )
    .eq("status", "verified")
    .is("archived_at", null)
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
  if (filters?.search?.trim()) {
    const raw = filters.search.trim().replace(/,/g, " ");
    const term = escapeLike(raw);
    const pattern = `%${term}%`;
    query = query.or(
      `model.ilike.${pattern},brand.ilike.${pattern},title.ilike.${pattern},description.ilike.${pattern},shaft.ilike.${pattern},shaft_flex.ilike.${pattern},degree.ilike.${pattern},item_type.ilike.${pattern},size.ilike.${pattern},colour.ilike.${pattern}`
    );
  }
  if (filters?.item_type?.trim()) {
    query = query.ilike("item_type", `%${escapeLike(filters.item_type.trim())}%`);
  }
  if (filters?.size?.trim()) {
    query = query.eq("size", filters.size.trim());
  }
  if (filters?.shaft?.trim()) {
    query = query.ilike("shaft", `%${escapeLike(filters.shaft.trim())}%`);
  }
  if (filters?.shaftFlex?.trim()) {
    query = query.eq("shaft_flex", filters.shaftFlex.trim());
  }
  if (filters?.degree?.trim()) {
    query = query.ilike("degree", `%${escapeLike(filters.degree.trim())}%`);
  }
  if (filters?.handed === "left" || filters?.handed === "right") {
    query = query.eq("handed", filters.handed);
  }

  const { data, error } = await query;
  // #region agent log
  try {
    fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "7a6302" },
      body: JSON.stringify({
        sessionId: "7a6302",
        location: "lib/listings.ts:getVerifiedListingsUncached",
        message: "query result",
        data: { error: error?.message ?? null, count: data?.length ?? 0 },
        hypothesisId: "L1",
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch (_) {}
  // #endregion
  if (error) throw error;
  return data ?? [];
}

export function getVerifiedListings(filters?: Filters) {
  const key = [
    "verified-listings",
    filters?.category ?? "",
    filters?.brand ?? "",
    filters?.minPrice ?? "",
    filters?.maxPrice ?? "",
    filters?.search ?? "",
    filters?.shaft ?? "",
    filters?.shaftFlex ?? "",
    filters?.degree ?? "",
    filters?.handed ?? "",
    filters?.item_type ?? "",
    filters?.size ?? "",
  ].join("-");
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
    .select("id, user_id, category, brand, model, title, condition, description, price, shaft, degree, shaft_flex, handed, item_type, size, colour, status, flagged, created_at, updated_at, listing_images ( id, storage_path, sort_order )")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

/** Fetches listing by id with session (RLS: verified or own). Not cached so it always runs in request context (cookies available). */
export function getListingById(id: string) {
  return getListingByIdUncached(id);
}

/** Fetch listing by id with service role (e.g. for buyer viewing a purchased/sold listing). */
async function getListingByIdAdminUncached(id: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("listings")
    .select("id, user_id, category, brand, model, title, condition, description, price, shaft, degree, shaft_flex, handed, item_type, size, colour, status, flagged, created_at, updated_at, listing_images ( id, storage_path, sort_order )")
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
