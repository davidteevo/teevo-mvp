import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function extractRecoveryToken(linkData: unknown): string | undefined {
  const d = linkData as {
    properties?: { hashed_token?: string; action_link?: string };
    hashed_token?: string;
    action_link?: string;
  };
  const hashed =
    d?.properties?.hashed_token ?? d?.hashed_token;
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

/**
 * Sends a password reset email using Admin generateLink (non-PKCE token).
 * Works when the user opens the link on any browser/device — unlike
 * resetPasswordForEmail + Send Email Hook, which issues pkce_ tokens tied to one browser.
 */
export async function POST(request: Request) {
  let email = "";
  try {
    const body = (await request.json()) as { email?: string };
    email = String(body.email ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("[forgot-password] RESEND_API_KEY not configured");
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const rawApp = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const appUrl =
    rawApp && !rawApp.toLowerCase().includes("placeholder")
      ? rawApp
      : "https://app.teevohq.com";

  try {
    const admin = createAdminClient();
    const { data: linkData, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${appUrl}/login/reset-password` },
    });

    if (error || !linkData) {
      // #region agent log
      fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d1a7bb" },
        body: JSON.stringify({
          sessionId: "d1a7bb",
          runId: "forgot-password",
          hypothesisId: "FP1",
          location: "app/api/auth/forgot-password/route.ts:generateLinkError",
          message: "generateLink failed or returned no data",
          data: { hasError: !!error, hasLinkData: !!linkData },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const token = extractRecoveryToken(linkData);
    if (!token) {
      console.error("[forgot-password] No token from generateLink");
      // #region agent log
      fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d1a7bb" },
        body: JSON.stringify({
          sessionId: "d1a7bb",
          runId: "forgot-password",
          hypothesisId: "FP2",
          location: "app/api/auth/forgot-password/route.ts:noToken",
          message: "generateLink returned no usable token",
          data: {},
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const cta_link = `${appUrl}/api/auth/set-password?token_hash=${encodeURIComponent(token)}`;
    // #region agent log
    fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d1a7bb" },
      body: JSON.stringify({
        sessionId: "d1a7bb",
        runId: "forgot-password",
        hypothesisId: "FP3",
        location: "app/api/auth/forgot-password/route.ts:tokenReady",
        message: "Forgot-password generated recovery token",
        data: { isPkceToken: token.startsWith("pkce_") },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    const firstName =
      email.split("@")[0]?.split(/[._-]/)[0]?.replace(/[^a-zA-Z0-9]/g, "") || "there";

    await sendEmail({
      type: "alert",
      to: email,
      subject: "Reset your Teevo password",
      variables: {
        title: "Reset your password",
        subtitle: "You requested a password reset",
        body: `Hi ${firstName}, click the button below to set a new password. If you didn't request this, you can ignore this email.`,
        cta_link,
        cta_text: "Reset password",
      },
    });
  } catch (e) {
    console.error("[forgot-password]", e);
    // #region agent log
    fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d1a7bb" },
      body: JSON.stringify({
        sessionId: "d1a7bb",
        runId: "forgot-password",
        hypothesisId: "FP4",
        location: "app/api/auth/forgot-password/route.ts:exception",
        message: "Forgot-password route exception",
        data: { errorMessage: e instanceof Error ? e.message : String(e) },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
