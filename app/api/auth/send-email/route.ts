import { Webhook } from "standardwebhooks";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";

type HookPayload = {
  user: {
    id: string;
    email?: string;
    email_new?: string;
    user_metadata?: { email?: string; name?: string };
  };
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

/** Safe first name for greeting; user_metadata.name can be non-string. */
function getFirstName(user: HookPayload["user"]): string {
  const name = user.user_metadata?.name;
  return String(name ?? "").trim().split(/\s+/)[0] || "there";
}

/**
 * Supabase Auth "Send Email" hook — all auth emails use the Resend platform.
 *
 * When enabled in Supabase Dashboard (Auth → Hooks → Send Email), Supabase calls this
 * instead of its built-in SMTP. Every auth email (signup, recovery, email change) is
 * sent via Resend using lib/email.ts and the Alert template.
 *
 * Env:
 * - RESEND_API_KEY (required for lib/email)
 * - RESEND_FROM (optional, e.g. "Teevo <hello@yourdomain.com>")
 * - SEND_EMAIL_HOOK_SECRET (from Supabase Dashboard → Auth → Hooks → secret, format "v1,whsec_<base64>")
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

  const { token_hash, redirect_to, email_action_type, token_new, token_hash_new } = email_data;
  const firstName = getFirstName(user);

  const buildVerifyUrl = (hash: string, type: string) =>
    `${supabaseUrl}/auth/v1/verify?token=${encodeURIComponent(hash)}&type=${encodeURIComponent(type)}&redirect_to=${encodeURIComponent(redirect_to)}`;

  const sendViaResend = async (
    to: string,
    subject: string,
    variables: { title: string; subtitle: string; body: string; cta_link: string; cta_text: string }
  ) => {
    await sendEmail({ type: "alert", to, subject, variables });
  };

  if (email_action_type === "signup") {
    try {
      await sendViaResend(
        email,
        "Confirm your Teevo email",
        {
          title: "Confirm your email",
          subtitle: "Verify your Teevo account",
          body: `Hi ${firstName}, click the button below to confirm your email address and start using Teevo.`,
          cta_link: buildVerifyUrl(token_hash, email_action_type),
          cta_text: "Confirm email",
        }
      );
    } catch (e) {
      console.error("Send email hook: signup email failed", e);
      return NextResponse.json(
        { error: { message: e instanceof Error ? e.message : "Failed to send email", http_code: 500 } },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } else if (email_action_type === "recovery") {
    try {
      await sendViaResend(
        email,
        "Reset your Teevo password",
        {
          title: "Reset your password",
          subtitle: "You requested a password reset",
          body: `Hi ${firstName}, click the button below to set a new password. If you didn't request this, you can ignore this email.`,
          cta_link: buildVerifyUrl(token_hash, email_action_type),
          cta_text: "Reset password",
        }
      );
    } catch (e) {
      console.error("Send email hook: recovery email failed", e);
      return NextResponse.json(
        { error: { message: e instanceof Error ? e.message : "Failed to send email", http_code: 500 } },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } else if (email_action_type === "email_change") {
    // Supabase: token_hash pairs with new email (user.email_new); token_hash_new pairs with current (user.email).
    const newEmail = user.email_new ?? email;
    try {
      await sendViaResend(
        newEmail,
        "Confirm your new Teevo email",
        {
          title: "Confirm your new email",
          subtitle: "You requested to change your email address",
          body: `Hi ${firstName}, click the button below to confirm this email address for your Teevo account.`,
          cta_link: buildVerifyUrl(token_hash, email_action_type),
          cta_text: "Confirm new email",
        }
      );
      if (token_hash_new && user.email && user.email !== newEmail) {
        await sendViaResend(
          user.email,
          "Teevo email change requested",
          {
            title: "Email change requested",
            subtitle: "A request was made to change your Teevo account email",
            body: `Hi ${firstName}, if you requested this change, confirm it from the email we sent to your new address. If you didn’t, you can ignore this email.`,
            cta_link: buildVerifyUrl(token_hash_new, email_action_type),
            cta_text: "View details",
          }
        );
      }
    } catch (e) {
      console.error("Send email hook: email_change failed", e);
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
