import { Webhook } from "standardwebhooks";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";

type HookPayload = {
  user: { id: string; email?: string; user_metadata?: { email?: string; name?: string } };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
};

/**
 * Supabase Auth "Send Email" hook.
 * When enabled in Supabase Dashboard (Auth → Hooks), Supabase calls this instead of sending its own email.
 * We send via Resend using the Alert template for signup and password reset.
 *
 * Env: SEND_EMAIL_HOOK_SECRET (from Supabase Dashboard → Auth → Hooks → Send Email → secret, format "v1,whsec_<base64>").
 */
export async function POST(request: Request) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: { message: "RESEND_API_KEY not configured", http_code: 500 } },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  const secret = process.env.SEND_EMAIL_HOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: { message: "SEND_EMAIL_HOOK_SECRET not configured", http_code: 500 } },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const rawBody = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const hookSecret = secret.replace(/^v1,whsec_/, "");
  const wh = new Webhook(hookSecret);
  let payload: HookPayload;
  try {
    payload = wh.verify(rawBody, headers) as HookPayload;
  } catch (e) {
    console.error("Send email hook: verification failed", e);
    return NextResponse.json(
      { error: { message: "Invalid signature", http_code: 401 } },
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const { user, email_data } = payload;
  const email = user.email ?? user.user_metadata?.email;
  if (!email) {
    return NextResponse.json(
      { error: { message: "No email in payload", http_code: 400 } },
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { token_hash, redirect_to, email_action_type } = email_data;
  const verifyUrl = `${supabaseUrl}/auth/v1/verify?token=${encodeURIComponent(token_hash)}&type=${encodeURIComponent(email_action_type)}&redirect_to=${encodeURIComponent(redirect_to)}`;

  const firstName = (user.user_metadata?.name ?? "").trim().split(/\s+/)[0] || "there";

  if (email_action_type === "signup") {
    try {
      await sendEmail({
        type: "alert",
        to: email,
        subject: "Confirm your Teevo email",
        variables: {
          title: "Confirm your email",
          subtitle: "Verify your Teevo account",
          body: `Hi ${firstName}, click the button below to confirm your email address and start using Teevo.`,
          cta_link: verifyUrl,
          cta_text: "Confirm email",
        },
      });
    } catch (e) {
      console.error("Send email hook: signup email failed", e);
      return NextResponse.json(
        { error: { message: e instanceof Error ? e.message : "Failed to send email", http_code: 500 } },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } else if (email_action_type === "recovery") {
    try {
      await sendEmail({
        type: "alert",
        to: email,
        subject: "Reset your Teevo password",
        variables: {
          title: "Reset your password",
          subtitle: "You requested a password reset",
          body: `Hi ${firstName}, click the button below to set a new password. If you didn't request this, you can ignore this email.`,
          cta_link: verifyUrl,
          cta_text: "Reset password",
        },
      });
    } catch (e) {
      console.error("Send email hook: recovery email failed", e);
      return NextResponse.json(
        { error: { message: e instanceof Error ? e.message : "Failed to send email", http_code: 500 } },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } else {
    console.error("Send email hook: unsupported type", email_action_type);
    return NextResponse.json(
      { error: { message: `Unsupported email_action_type: ${email_action_type}`, http_code: 400 } },
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  console.info("Send email hook: sent", email_action_type, "to", email);
  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
