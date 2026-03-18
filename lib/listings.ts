import { unstable_cache } from "next/cache";
import { brandFilterIlikeTerms, canonicalFilterBrand } from "@/lib/brand-canonical";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ListingCategory, ListingCondition } from "@/types/database";

const LISTING_CONDITION_FILTER: ListingCondition[] = [
  "New",
  "Excellent",
  "Good",
  "Fair",
  "Used",
  "New with tags",
  "New without tags",
];

export type ListingSort = "newest" | "price_asc" | "price_desc";

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
  condition?: string;
  sort?: string;
  /** Min loft (numeric); uses degree_numeric column. Mutually exclusive with degree in UI. */
  degreeMin?: string;
}

/** Chained Supabase query after select + base eq filters. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyHomeFilters(query: any, filters?: Filters) {
  let q = query;
  if (filters?.category) {
    q = q.eq("category", filters.category as ListingCategory);
  }
  if (filters?.brand?.trim()) {
    const terms = brandFilterIlikeTerms(filters.brand.trim());
    if (terms.length === 1) {
      q = q.ilike("brand", `%${escapeLike(terms[0])}%`);
    } else if (terms.length > 1) {
      q = q.or(terms.map((t) => `brand.ilike.%${escapeLike(t)}%`).join(","));
    }
  }
  if (filters?.minPrice) {
    const pence = Math.round(parseFloat(filters.minPrice) * 100);
    if (!Number.isNaN(pence)) q = q.gte("price", pence);
  }
  if (filters?.maxPrice) {
    const pence = Math.round(parseFloat(filters.maxPrice) * 100);
    if (!Number.isNaN(pence)) q = q.lte("price", pence);
  }
  if (filters?.search?.trim()) {
    const raw = filters.search.trim().replace(/,/g, " ");
    const term = escapeLike(raw);
    const pattern = `%${term}%`;
    q = q.or(
      `model.ilike.${pattern},brand.ilike.${pattern},title.ilike.${pattern},description.ilike.${pattern},shaft.ilike.${pattern},shaft_flex.ilike.${pattern},degree.ilike.${pattern},item_type.ilike.${pattern},size.ilike.${pattern},colour.ilike.${pattern}`
    );
  }
  if (filters?.item_type?.trim()) {
    q = q.ilike("item_type", `%${escapeLike(filters.item_type.trim())}%`);
  }
  if (filters?.size?.trim()) {
    q = q.eq("size", filters.size.trim());
  }
  if (filters?.shaft?.trim()) {
    q = q.ilike("shaft", `%${escapeLike(filters.shaft.trim())}%`);
  }
  if (filters?.shaftFlex?.trim()) {
    q = q.eq("shaft_flex", filters.shaftFlex.trim());
  }
  const degreeMinNum = filters?.degreeMin?.trim()
    ? parseFloat(filters.degreeMin.trim())
    : NaN;
  if (Number.isFinite(degreeMinNum)) {
    q = q.gte("degree_numeric", degreeMinNum);
  } else if (filters?.degree?.trim()) {
    q = q.ilike("degree", `%${escapeLike(filters.degree.trim())}%`);
  }
  if (filters?.handed === "left" || filters?.handed === "right") {
    q = q.eq("handed", filters.handed);
  }
  if (
    filters?.condition &&
    LISTING_CONDITION_FILTER.includes(filters.condition as ListingCondition)
  ) {
    q = q.eq("condition", filters.condition as ListingCondition);
  }
  return q;
}

function applySort(query: any, sort?: string) {
  const s = sort ?? "newest";
  if (s === "price_asc") {
    return query.order("price", { ascending: true }).order("created_at", { ascending: false });
  }
  if (s === "price_desc") {
    return query.order("price", { ascending: false }).order("created_at", { ascending: false });
  }
  return query.order("created_at", { ascending: false });
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
      "id, user_id, category, brand, model, title, condition, description, price, shaft, degree, shaft_flex, lie_angle, club_length, shaft_weight, shaft_material, grip_brand, grip_model, grip_size, grip_condition, handed, item_type, size, colour, status, flagged, created_at, updated_at, listing_images ( id, storage_path, sort_order ), users!user_id ( display_name )"
    )
    .eq("status", "verified")
    .is("archived_at", null);

  query = applyHomeFilters(query, filters);
  query = applySort(query, filters?.sort);
  query = query.limit(LISTINGS_GRID_LIMIT);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export function getVerifiedListings(filters?: Filters) {
  const key = [
    "verified-listings",
    filters?.category ?? "",
    filters?.brand?.trim() ? canonicalFilterBrand(filters.brand.trim()) : "",
    filters?.minPrice ?? "",
    filters?.maxPrice ?? "",
    filters?.search ?? "",
    filters?.shaft ?? "",
    filters?.shaftFlex ?? "",
    filters?.degree ?? "",
    filters?.degreeMin ?? "",
    filters?.handed ?? "",
    filters?.item_type ?? "",
    filters?.size ?? "",
    filters?.condition ?? "",
    filters?.sort ?? "",
  ].join("-");
  return unstable_cache(
    () => getVerifiedListingsUncached(filters),
    [key],
    { revalidate: LISTINGS_CACHE_SECONDS }
  )();
}

/** Count of verified listings matching home filters (uncached; for filter UI). */
export async function getVerifiedListingsCount(filters?: Filters): Promise<number> {
  const supabase = createAdminClient();
  let query = supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("status", "verified")
    .is("archived_at", null);
  query = applyHomeFilters(query, filters);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

async function getListingByIdUncached(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select("id, user_id, category, brand, model, title, condition, description, price, shaft, degree, shaft_flex, lie_angle, club_length, shaft_weight, shaft_material, grip_brand, grip_model, grip_size, grip_condition, handed, item_type, size, colour, status, flagged, created_at, updated_at, listing_images ( id, storage_path, sort_order )")
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
    .select("id, user_id, category, brand, model, title, condition, description, price, shaft, degree, shaft_flex, lie_angle, club_length, shaft_weight, shaft_material, grip_brand, grip_model, grip_size, grip_condition, handed, item_type, size, colour, status, flagged, created_at, updated_at, listing_images ( id, storage_path, sort_order )")
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
