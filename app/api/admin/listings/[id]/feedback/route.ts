import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { ensureEmailSent } from "@/lib/email-triggers";
import { EmailTriggerType } from "@/lib/email-triggers";

export const dynamic = "force-dynamic";

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

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const comment = typeof body.comment === "string" ? body.comment.trim() : null;

  const { error } = await admin
    .from("listings")
    .update({
      admin_feedback: comment || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

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
        try {
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
              cta_link: editUrl,
              cta_text: "Edit listing",
            },
          });
        } catch (e) {
          console.error("Failed to send listing edits email:", e);
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
