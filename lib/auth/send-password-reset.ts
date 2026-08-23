import { sendEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/app-env";

function extractRecoveryToken(linkData: unknown): string | undefined {
  const d = linkData as {
    properties?: { hashed_token?: string; action_link?: string };
    hashed_token?: string;
    action_link?: string;
  };
  const hashed = d?.properties?.hashed_token ?? d?.hashed_token;
  if (hashed) return hashed;
  const action = d?.properties?.action_link ?? d?.action_link;
  if (action) {
    try {
      const u = new URL(action);
      return u.searchParams.get("token_hash") ?? u.searchParams.get("token") ?? undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export async function sendPasswordResetEmail(email: string, firstName?: string | null): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Email sending is not configured");
  }
  const rawApp = getAppUrl();
  const appUrl = rawApp.toLowerCase().includes("placeholder")
    ? "https://app.teevohq.com"
    : rawApp;
  const admin = createAdminClient();
  const { data: linkData, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${appUrl}/login/reset-password` },
  });
  if (error || !linkData) {
    throw new Error(error?.message ?? "Could not generate password reset link");
  }
  const token = extractRecoveryToken(linkData);
  if (!token) {
    throw new Error("Could not generate password reset link");
  }
  const cta_link = `${appUrl}/api/auth/set-password?token_hash=${encodeURIComponent(token)}`;
  const greeting =
    firstName?.trim() ||
    email.split("@")[0]?.split(/[._-]/)[0]?.replace(/[^a-zA-Z0-9]/g, "") ||
    "there";
  await sendEmail({
    type: "alert",
    to: email,
    subject: "Let’s get you back into Teevo",
    variables: {
      title: "Reset your password",
      subtitle: "We received a password reset request for your account.",
      body: `Hi ${greeting}, no worries — it happens! Click the button below to set a new password.\n\nDidn't request this? You can safely ignore this email.`,
      cta_link,
      cta_text: "Reset password",
    },
  });
}
