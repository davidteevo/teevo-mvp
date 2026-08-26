import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { alreadyProcessedResponse } from "@/lib/admin-action-centre";
import { requireAdmin, logAdminAction } from "@/lib/referral/admin-auth";
import { resolveListingReviewRequired, notifySellerListingApproved } from "@/lib/notification-events";
import { notifyWatchersNowAvailable } from "@/lib/watchlist-emails";
import { onListingVerified } from "@/lib/referral/rewards";
import { onFounderListingVerified } from "@/lib/founder/reward";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { admin, user } = auth;

  const { data: existing } = await admin.from("listings").select("id, status").eq("id", id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  if (existing.status !== "pending") return alreadyProcessedResponse();

  const { data: updated, error } = await admin
    .from("listings")
    .update({ status: "verified", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending")
    .select("user_id, created_on_behalf")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!updated) return alreadyProcessedResponse();

  await logAdminAction(admin, {
    adminId: user.id,
    action: "listing_approved",
    targetType: "listing",
    targetId: id,
  });

  if (updated.user_id) {
    await onListingVerified(admin, {
      listingId: id,
      sellerId: updated.user_id,
      createdOnBehalf: updated.created_on_behalf === true,
    }).catch((e) => console.error("onListingVerified failed", e));
    await onFounderListingVerified(admin, {
      listingId: id,
      sellerId: updated.user_id,
      createdOnBehalf: updated.created_on_behalf === true,
    }).catch((e) => console.error("onFounderListingVerified failed", e));
  }
  await resolveListingReviewRequired(admin, id);
  if (updated.user_id) {
    await notifySellerListingApproved(admin, {
      listingId: id,
      sellerId: updated.user_id,
    }).catch((e) => console.error("notifySellerListingApproved failed", e));
  }
  await notifyWatchersNowAvailable(admin, id).catch((e) =>
    console.error("notifyWatchersNowAvailable failed", e)
  );
  revalidateTag("public-listings");
  revalidatePath(`/listing/${id}`);
  revalidatePath("/");
  revalidatePath("/admin");
  return NextResponse.json({ ok: true });
}
