import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { isPurchasableListingStatus } from "@/lib/listing-availability";
import { notifyWatchersOfPriceDrop } from "@/lib/watchlist-emails";

export const dynamic = "force-dynamic";

/**
 * POST /api/listings/[id]/reduce-price
 * Owner or admin. Verified, not archived. New price must be lower.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { price?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const pricePence =
    typeof body.price === "number"
      ? Math.round(body.price)
      : typeof body.price === "string"
        ? Math.round(Number(body.price))
        : NaN;

  if (!Number.isFinite(pricePence) || pricePence <= 0) {
    return NextResponse.json({ error: "Enter a valid price" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: listing, error: fetchError } = await admin
    .from("listings")
    .select("id, user_id, price, status, archived_at")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
  const isAdmin = profile?.role === "admin";
  if (listing.user_id !== user.id && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (listing.archived_at || !isPurchasableListingStatus(listing.status)) {
    return NextResponse.json({ error: "Only live listings can have their price reduced" }, { status: 400 });
  }
  if (pricePence >= listing.price) {
    return NextResponse.json({ error: "New price must be lower than the current price" }, { status: 400 });
  }

  const oldPrice = listing.price;
  const { error } = await admin
    .from("listings")
    .update({ price: pricePence, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await notifyWatchersOfPriceDrop(admin, id, oldPrice, pricePence).catch((e) =>
    console.error("notifyWatchersOfPriceDrop failed", e)
  );

  revalidateTag("public-listings");
  revalidatePath(`/listing/${id}`);
  revalidatePath("/");
  return NextResponse.json({ ok: true, price: pricePence });
}
