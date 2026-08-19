import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SUPPORT_CATEGORIES = [
  "Buying",
  "Selling",
  "Listing",
  "Payment",
  "Delivery",
  "Account",
  "Report a problem",
  "Something else",
] as const;

type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

function isValidCategory(value: unknown): value is SupportCategory {
  return typeof value === "string" && SUPPORT_CATEGORIES.includes(value as SupportCategory);
}

/**
 * POST /api/support
 * Body: {
 *   category: string,
 *   subject: string,
 *   message: string,
 *   attachmentPath?: string,   // storage object path returned by /api/support/upload-url
 *   pageUrl?: string,          // current page (provided client-side, not trusted for security)
 *   listingId?: string,
 *   orderId?: string,
 * }
 * Sends an alert email to support@teevohq.com and an acknowledgement to the user.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));

    const category = body.category;
    const subject =
      typeof body.subject === "string" ? body.subject.trim() : "";
    const message =
      typeof body.message === "string" ? body.message.trim() : "";
    const attachmentPath =
      typeof body.attachmentPath === "string" && body.attachmentPath.trim()
        ? body.attachmentPath.trim()
        : null;
    const pageUrl =
      typeof body.pageUrl === "string" ? body.pageUrl.trim().slice(0, 500) : "";
    const listingId =
      typeof body.listingId === "string" ? body.listingId.trim().slice(0, 100) : "";
    const orderId =
      typeof body.orderId === "string" ? body.orderId.trim().slice(0, 100) : "";

    if (!isValidCategory(category)) {
      return NextResponse.json({ error: "Please select a category." }, { status: 400 });
    }
    if (!subject) {
      return NextResponse.json({ error: "Subject is required." }, { status: 400 });
    }
    if (subject.length > 200) {
      return NextResponse.json({ error: "Subject is too long." }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }
    if (message.length > 5000) {
      return NextResponse.json({ error: "Message is too long (max 5000 characters)." }, { status: 400 });
    }

    // Resolve display name server-side using admin client
    const admin = createAdminClient();
    const { data: userProfile } = await admin
      .from("users")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();
    const displayName = userProfile?.display_name?.trim() || "";

    // Build signed URL for attachment if provided
    let attachmentSignedUrl = "";
    if (attachmentPath) {
      const { data: signedData } = await admin.storage
        .from("support-attachments")
        .createSignedUrl(attachmentPath, 60 * 60 * 24 * 7); // 7-day link
      if (signedData?.signedUrl) {
        attachmentSignedUrl = signedData.signedUrl;
      }
    }

    const submittedAt = new Date().toISOString();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://teevohq.com";

    // Build admin alert body
    const adminBodyLines: string[] = [
      `Category: ${category}`,
      `Subject: ${subject}`,
      "",
      message,
      "",
      "— Context —",
      `User: ${displayName || "(no name)"}`,
      `Email: ${user.email ?? "unknown"}`,
      `User ID: ${user.id}`,
      `Submitted: ${submittedAt}`,
    ];
    if (pageUrl) adminBodyLines.push(`Page: ${pageUrl}`);
    if (listingId) adminBodyLines.push(`Listing ID: ${listingId}`);
    if (orderId) adminBodyLines.push(`Order ID: ${orderId}`);
    if (attachmentSignedUrl) adminBodyLines.push(`Attachment: ${attachmentSignedUrl}`);

    // Send to support inbox
    await sendEmail({
      type: "alert",
      to: "support@teevohq.com",
      subject: `[Support] ${category}: ${subject}`,
      variables: {
        title: "New support request",
        subtitle: `${displayName || user.email || "A user"} · ${category}`,
        body: adminBodyLines.join("\n"),
        cta_link: `${appUrl}/admin`,
        cta_text: "Open admin",
      },
    });

    // Send acknowledgement to user (best-effort — don't fail the submission if this errors)
    try {
      const userEmail = user.email;
      if (userEmail) {
        await sendEmail({
          type: "standard",
          to: userEmail,
          subject: "We've received your message — Teevo Support",
          variables: {
            title: "We've got it 👍",
            subtitle: `Your message has been sent to the Teevo team.`,
            body: `Thanks for getting in touch. We've received your support request about <strong>${category}</strong> and we'll get back to you as soon as we can.\n\nYou don't need to do anything else right now — we'll reply to <strong>${userEmail}</strong>.`,
            cta_link: `${appUrl}/support`,
            cta_text: "Back to Teevo",
          },
        });
      }
    } catch (ackErr) {
      console.error("Support ack email failed (non-fatal):", ackErr);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Support submit error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to send support request." },
      { status: 500 }
    );
  }
}
