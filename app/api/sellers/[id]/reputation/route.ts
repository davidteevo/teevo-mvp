import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { formatRatingAverage, getSellerPublicProfile, publicAvatarUrl } from "@/lib/seller-reviews";

export const dynamic = "force-dynamic";

/**
 * GET /api/sellers/[id]/reputation
 * Public aggregate only.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = createAdminClient();
  const profile = await getSellerPublicProfile(admin, id);
  if (!profile) {
    return NextResponse.json({ error: "Seller not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: profile.id,
    display_name: profile.display_name,
    avatar_url: publicAvatarUrl(profile.avatar_path),
    founding_seller_rank: profile.founding_seller_rank,
    rating_average: profile.rating_average,
    rating_average_display: formatRatingAverage(profile.rating_average),
    rating_count: profile.rating_count,
  });
}
