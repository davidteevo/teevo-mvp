import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { alreadyProcessedResponse } from "@/lib/admin-action-centre";
import { requireAdmin, logAdminAction } from "@/lib/referral/admin-auth";
import { resolveListingReviewRequired } from "@/lib/notification-events";
import { notifyWatchersUnavailable } from "@/lib/watchlist-emails";

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
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!updated) return alreadyProcessedResponse();

  await logAdminAction(admin, {
    adminId: user.id,
    action: "listing_rejected",
    targetType: "listing",
    targetId: id,
  });

  await resolveListingReviewRequired(admin, id);
  await notifyWatchersUnavailable(admin, id, "rejected").catch((e) =>
    console.error("notifyWatchersUnavailable failed", e)
  );
  revalidateTag("public-listings");
  revalidatePath(`/listing/${id}`);
  revalidatePath("/");
  revalidatePath("/admin");
  return NextResponse.json({ ok: true });
}
