import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/feedback
 * Body: { message: string }
 * Sends founding seller feedback to the first TEEVO_ADMIN_EMAILS address.
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
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }
    if (message.length > 5000) {
      return NextResponse.json({ error: "Message is too long" }, { status: 400 });
    }

    const adminEmails = process.env.TEEVO_ADMIN_EMAILS?.trim();
    const to = adminEmails?.split(",")[0]?.trim();
    if (!to || to === "admin@example.com") {
      return NextResponse.json(
        { error: "Set TEEVO_ADMIN_EMAILS in .env.local to your real email (not .env.example). Restart the dev server after changing." },
        { status: 500 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    await sendEmail({
      type: "alert",
      to,
      subject: "Founding seller feedback",
      variables: {
        title: "Founding seller feedback",
        subtitle: `From: ${user.email ?? "unknown"}`,
        body: message,
        cta_link: appUrl || "#",
        cta_text: "Open dashboard",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Feedback send error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to send feedback" },
      { status: 500 }
    );
  }
}
