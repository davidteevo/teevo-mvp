import { Webhook } from "standardwebhooks";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/app-env";

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
 * - RESEND_API_KEY (required for lib/email; if missing, hook returns 500 and Supabase may send default email)
 * - RESEND_FROM (optional, e.g. "Teevo <hello@yourdomain.com>")
 * - SEND_EMAIL_HOOK_SECRET (must match Supabase Auth Hooks secret; if wrong, hook returns 401 and Supabase may send default email with supabase.co link)
 * - NEXT_PUBLIC_APP_URL (required in production for recovery link; e.g. https://app.teevohq.com)
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
  /** Recovery link must point at the app, not Supabase or a deploy preview (e.g. 69b9a66b--ephemeral-zabaione.netlify.app). */
  const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : "";
  const isDeployPreview = fromPayload && /--.*\.netlify\.app/i.test(fromPayload);
  const appOrigin =
    (fromPayload &&
      fromPayload !== supabaseOrigin &&
      !fromPayload.includes("supabase.co") &&
      !isDeployPreview)
      ? fromPayload
      : getAppUrl();

  const buildVerifyUrl = (hash: string, type: string) =>
    `${supabaseUrl}/auth/v1/verify?token=${encodeURIComponent(hash)}&type=${encodeURIComponent(type)}&redirect_to=${encodeURIComponent(redirect_to)}`;

  /** For recovery, use app set-password URL so we can verify token_hash server-side (no PKCE). */
  const buildRecoveryLink = () =>
    `${appOrigin}/api/auth/set-password?token_hash=${encodeURIComponent(token_hash)}`;

  /** Signup confirmation lands on the app so we can show a confirmed page, then ask for password. */
  const buildSignupConfirmUrl = () => {
    const params = new URLSearchParams({ token_hash });
    try {
      const next = new URL(redirect_to).searchParams.get("next");
      if (
        next &&
        next.startsWith("/") &&
        !next.startsWith("//") &&
        next !== "/dashboard" &&
        !next.startsWith("/auth/") &&
        !next.startsWith("/login")
      ) {
        params.set("next", next);
      }
    } catch {
      // no usable next — confirm page defaults to onboarding
    }
    return `${appOrigin}/auth/confirm-email?${params.toString()}`;
  };

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
        "👋 Welcome to Teevo — just one more step",
        {
          title: "Just one more step",
          subtitle: "Confirm your email to get started.",
          body: `Hi ${firstName}, thanks for joining Teevo! Click the button below to confirm your email address and activate your account.\n\nOnce confirmed, you'll be ready to buy and sell golf clubs on Teevo.`,
          cta_link: buildSignupConfirmUrl(),
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
    try {
      await sendViaResend(
        email,
        "🔐 Let's get you back into Teevo",
        {
          title: "Reset your password",
          subtitle: "We received a password reset request for your account.",
          body: `Hi ${firstName}, no worries — it happens! Click the button below to set a new password.\n\nDidn't request this? You can safely ignore this email.`,
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
        "\u2709\uFE0F One quick check for your new email",
        {
          title: "Confirm your new email address",
          subtitle: "You requested to change your Teevo email.",
          body: `Hi ${firstName}, click the button below to confirm this email address for your Teevo account.\n\nDidn't request this? You can safely ignore this email.`,
          cta_link: buildVerifyUrl(token_hash, email_action_type),
          cta_text: "Confirm new email",
        }
      );
      if (token_hash_new && user.email && user.email !== newEmail) {
        await sendViaResend(
          user.email,
          "\uD83D\uDC40 Your Teevo email is being changed",
          {
            title: "Your email address is being changed",
            subtitle: "A request was made to update your Teevo account email.",
            body: `Hi ${firstName}, we received a request to change the email address on your Teevo account.\n\nIf you made this request, confirm it from the email we sent to your new address. If you didn't request this, you can safely ignore this email.`,
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
        "\uD83D\uDC4B You've been invited to Teevo",
        {
          title: "You've been invited to Teevo",
          subtitle: "Set your password to get started.",
          body: `Hi ${firstName}, you've been invited to Teevo — the modern marketplace for second-hand golf clubs.\n\nClick the button below to set your password and access your account.`,
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
    return NextResponse.json(
      { error: { message: `Unsupported email_action_type: ${email_action_type}`, http_code: 400 } },
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Suppress unused variable warnings for token_new (present in payload but not used in current flows)
  void token_new;

  console.info("Send email hook: sent", email_action_type, "to", email);
  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
