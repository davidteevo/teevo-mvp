import { createClient } from "@/lib/supabase/server";
import type { ListingCategory } from "@/types/database";

interface Filters {
  category?: string;
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
}

export async function getVerifiedListings(filters?: Filters) {
  const supabase = await createClient();
  let query = supabase
    .from("listings")
    .select(
      `
      *,
      listing_images ( id, storage_path, sort_order )
    `
    )
    .eq("status", "verified")
    .order("created_at", { ascending: false });

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

export async function getListingById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(
      `
      *,
      listing_images ( id, storage_path, sort_order )
    `
    )
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}
