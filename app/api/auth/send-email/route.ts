import { Webhook } from "standardwebhooks";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

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

/** Safe first name for greeting; prefers profile first_name, then user_metadata.name. */
function getFirstNameFromMetadata(user: HookPayload["user"]): string {
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
    // #region agent log
    fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d1a7bb" },
      body: JSON.stringify({
        sessionId: "d1a7bb",
        location: "app/api/auth/send-email/route.ts:verifyFailed",
        message: "Send email hook verification failed",
        data: { errorMessage: e instanceof Error ? e.message : String(e) },
        timestamp: Date.now(),
        hypothesisId: "H3",
      }),
    }).catch(() => {});
    // #endregion
    return NextResponse.json(
      { error: { message: "Invalid signature", http_code: 401 } },
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const { user, email_data } = payload;
  // #region agent log
  fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d1a7bb" },
    body: JSON.stringify({
      sessionId: "d1a7bb",
      location: "app/api/auth/send-email/route.ts:payload",
      message: "Send email hook payload",
      data: {
        email_action_type: (email_data as { email_action_type?: string })?.email_action_type,
        hasUser: !!user,
        hasEmailData: !!email_data,
        userId: user?.id,
      },
      timestamp: Date.now(),
      hypothesisId: "H1",
    }),
  }).catch(() => {});
  // #endregion
  const email = user.email ?? user.user_metadata?.email;
  if (!email) {
    return NextResponse.json(
      { error: { message: "No email in payload", http_code: 400 } },
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  let firstName: string;
  try {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("users")
      .select("first_name")
      .eq("id", user.id)
      .maybeSingle();
    firstName = profile?.first_name?.trim() || getFirstNameFromMetadata(user);
  } catch {
    firstName = getFirstNameFromMetadata(user);
  }

  const { token_hash, redirect_to, email_action_type, token_new, token_hash_new, site_url } = email_data;
  const fromPayload =
    (site_url ?? "").replace(/\/$/, "") ||
    (typeof redirect_to === "string" && /^https?:\/\//.test(redirect_to) ? new URL(redirect_to).origin : "");
  /** Recovery link must point at the app, not Supabase. Supabase often sends its own URL in site_url/redirect_to. */
  const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : "";
  const appOrigin =
    (fromPayload && fromPayload !== supabaseOrigin && !fromPayload.includes("supabase.co"))
      ? fromPayload
      : (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "") || "http://localhost:3000";

  const buildVerifyUrl = (hash: string, type: string) =>
    `${supabaseUrl}/auth/v1/verify?token=${encodeURIComponent(hash)}&type=${encodeURIComponent(type)}&redirect_to=${encodeURIComponent(redirect_to)}`;

  /** For recovery, use app set-password URL so we can verify token_hash server-side (no PKCE). */
  const buildRecoveryLink = () =>
    `${appOrigin}/api/auth/set-password?token_hash=${encodeURIComponent(token_hash)}`;

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
    const recoveryLink = buildRecoveryLink();
    // #region agent log
    fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d1a7bb" },
      body: JSON.stringify({
        sessionId: "d1a7bb",
        runId: "reset-debug",
        location: "app/api/auth/send-email/route.ts:recovery",
        message: "Send email hook sending recovery with app link",
        data: { appOrigin, linkStartsWithApp: /^https?:\/\//.test(appOrigin) && !recoveryLink.includes("supabase.co") },
        timestamp: Date.now(),
        hypothesisId: "R1",
      }),
    }).catch(() => {});
    // #endregion
    try {
      await sendViaResend(
        email,
        "Reset your Teevo password",
        {
          title: "Reset your password",
          subtitle: "You requested a password reset",
          body: `Hi ${firstName}, click the button below to set a new password. If you didn't request this, you can ignore this email.`,
          cta_link: recoveryLink,
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
  } else if (email_action_type === "invite") {
    try {
      await sendViaResend(
        email,
        "You're invited to Teevo",
        {
          title: "Set your password",
          subtitle: "You've been invited to Teevo",
          body: `Hi ${firstName}, click the button below to set your password and access your Teevo account.`,
          cta_link: buildVerifyUrl(token_hash, email_action_type),
          cta_text: "Accept invite",
        }
      );
    } catch (e) {
      console.error("Send email hook: invite email failed", e);
      return NextResponse.json(
        { error: { message: e instanceof Error ? e.message : "Failed to send email", http_code: 500 } },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } else {
    console.error("Send email hook: unsupported type", email_action_type);
    // #region agent log
    fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "a0a29d" },
      body: JSON.stringify({
        sessionId: "a0a29d",
        location: "app/api/auth/send-email/route.ts:unsupported",
        message: "Send email hook returning 400 unsupported type",
        data: { email_action_type },
        timestamp: Date.now(),
        hypothesisId: "H1",
      }),
    }).catch(() => {});
    // #endregion
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
