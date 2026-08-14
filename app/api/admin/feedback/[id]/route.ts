import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { FEEDBACK_EVENTS, REVIEW_REPORT_REASON_LABELS } from "@/lib/seller-reviews";
import { trackServerEvent } from "@/lib/starter-pack";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { admin, user };
}

/**
 * GET /api/admin/feedback/[id]
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { data: review, error } = await auth.admin
    .from("seller_reviews")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!review) return NextResponse.json({ error: "Feedback not found" }, { status: 404 });

  const [{ data: reports }, { data: events }, { data: users }] = await Promise.all([
    auth.admin
      .from("seller_review_reports")
      .select("*")
      .eq("review_id", id)
      .order("created_at", { ascending: false }),
    auth.admin
      .from("seller_review_moderation_events")
      .select("*")
      .eq("review_id", id)
      .order("created_at", { ascending: false }),
    auth.admin
      .from("users")
      .select("id, display_name, email")
      .in("id", [review.buyer_id, review.seller_id, review.moderated_by].filter(Boolean)),
  ]);

  const nameMap = new Map<string, string>();
  for (const u of users ?? []) {
    nameMap.set(u.id, u.display_name?.trim() || u.email || u.id.slice(0, 8));
  }

  const reporterIds = Array.from(new Set((reports ?? []).map((r) => r.reporter_id).filter(Boolean)));
  if (reporterIds.length) {
    const { data: reporters } = await auth.admin
      .from("users")
      .select("id, display_name, email")
      .in("id", reporterIds);
    for (const u of reporters ?? []) {
      nameMap.set(u.id, u.display_name?.trim() || u.email || u.id.slice(0, 8));
    }
  }

  await trackServerEvent(auth.admin, FEEDBACK_EVENTS.ADMIN_REVIEW_OPENED, {
    userId: auth.user.id,
    properties: { review_id: id },
  });

  return NextResponse.json({
    review: {
      ...review,
      buyer_name: nameMap.get(review.buyer_id),
      seller_name: nameMap.get(review.seller_id),
      moderated_by_name: review.moderated_by ? nameMap.get(review.moderated_by) : null,
    },
    reports: (reports ?? []).map((r) => ({
      ...r,
      reporter_name: r.reporter_id ? nameMap.get(r.reporter_id) : "Unknown",
      reason_label:
        REVIEW_REPORT_REASON_LABELS[r.reason as keyof typeof REVIEW_REPORT_REASON_LABELS] ??
        r.reason,
    })),
    moderation_events: events ?? [],
  });
}
