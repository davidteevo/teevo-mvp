import { NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/referral/admin-auth";
import { ensureEmailSent, EmailTriggerType, getListingEmailContext } from "@/lib/email-triggers";
import { clearSentEmail } from "@/lib/fulfilment-emails";
import { createNotification, NotificationType, NotificationEntityType } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { admin, user } = auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const comment = typeof body.comment === "string" ? body.comment.trim() : null;

  const { data: existingListing } = await admin
    .from("listings")
    .select("review_count")
    .eq("id", id)
    .single();

  const { error } = await admin
    .from("listings")
    .update({
      admin_feedback: comment || null,
      updated_at: new Date().toISOString(),
      ...(comment ? { review_count: ((existingListing?.review_count as number) ?? 0) + 1 } : {}),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction(admin, {
    adminId: user.id,
    action: "listing_feedback",
    targetType: "listing",
    targetId: id,
    payload: { comment: comment || null },
  });

  if (comment) {
    const { data: listing } = await admin
      .from("listings")
      .select("user_id")
      .eq("id", id)
      .single();
    if (listing?.user_id) {
      const { data: seller } = await admin
        .from("users")
        .select("email")
        .eq("id", listing.user_id)
        .single();
      const toEmail = seller?.email?.trim();

      if (toEmail) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
        const editUrl = `${appUrl}/sell/edit/${id}`;
        const { hero_image } = await getListingEmailContext(admin, id);
        try {
          // Clear idempotency row so re-sends work when admin leaves new feedback
          await clearSentEmail(admin, EmailTriggerType.LISTING_EDITS_REQUESTED, id);

          await ensureEmailSent(admin, {
            emailType: EmailTriggerType.LISTING_EDITS_REQUESTED,
            referenceId: id,
            referenceType: "listing",
            recipientId: listing.user_id,
            to: toEmail,
            subject: "Teevo: edits needed for your listing",
            type: "alert",
            variables: {
              title: "Edits needed for your listing",
              subtitle: "Our team left feedback",
              body: comment,
              hero_image,
              cta_link: editUrl,
              cta_text: "Edit listing",
            },
          });
        } catch (e) {
          console.error("Failed to send listing edits email:", e);
        }
      }

      // Send in-app notification to the seller
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
        const editUrl = `${appUrl}/sell/edit/${id}`;

        await createNotification(admin, {
          userId: listing.user_id,
          type: NotificationType.LISTING_EDITS_REQUESTED,
          title: "Edits needed for your listing",
          message: comment,
          entityType: NotificationEntityType.LISTING,
          entityId: id,
          actionUrl: editUrl,
          actionLabel: "Edit listing",
          requiresAction: true,
        });
      } catch (e) {
        console.error("Failed to create listing edits notification:", e);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
