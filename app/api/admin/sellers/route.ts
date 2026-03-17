import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Secure random password for new user; never sent to the user (they set password via recovery link). */
function generateTempPassword(): string {
  return randomBytes(24).toString("hex");
}

/**
 * POST /api/admin/sellers
 * Admin-only. Body: first_name, last_name (surname), email, phone? (optional), admin_notes? (optional).
 * Creates auth user via createUser (no Supabase auth email), generates recovery link, sends invite via Resend.
 * Avoids Supabase 2/hour email rate limit. If user with email already exists, returns 409 with existing user id.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: adminUser },
    } = await supabase.auth.getUser();
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin.from("users").select("role").eq("id", adminUser.id).single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const first_name = typeof body.first_name === "string" ? body.first_name.trim() || null : null;
    const last_name = typeof body.last_name === "string" ? body.last_name.trim() || null : null;
    const surname = last_name;
    const phone = typeof body.phone === "string" ? body.phone.trim() || null : null;
    const admin_notes = typeof body.admin_notes === "string" ? body.admin_notes.trim() || null : null;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Check for existing user by email (public.users)
    const { data: existing } = await admin
      .from("users")
      .select("id, email, first_name, surname")
      .ilike("email", email)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          error: "User already exists with this email",
          existing_user_id: existing.id,
          user: { id: existing.id, email: existing.email, first_name: existing.first_name, surname: existing.surname },
        },
        { status: 409 }
      );
    }

    // Create auth user with temp password (no Supabase email sent; we send via Resend)
    const tempPassword = generateTempPassword();
    const { data: createData, error: createError } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name: first_name ?? undefined,
        surname: surname ?? undefined,
      },
    });

    if (createError) {
      // Duplicate: auth user might already exist
      if (
        createError.message?.toLowerCase().includes("already") ||
        createError.message?.toLowerCase().includes("exists")
      ) {
        const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 });
        const match = listData?.users?.find((u) => u.email?.toLowerCase() === email);
        if (match) {
          const { data: pubUser } = await admin.from("users").select("id").eq("id", match.id).single();
          if (pubUser) {
            return NextResponse.json(
              { error: "User already exists with this email", existing_user_id: match.id },
              { status: 409 }
            );
          }
          const now = new Date().toISOString();
          await admin.from("users").insert({
            id: match.id,
            email: match.email ?? email,
            role: "seller",
            first_name,
            surname,
            created_by_admin: true,
            invited_at: now,
            phone,
            updated_at: now,
          });
          await admin.from("admin_actions").insert({
            admin_id: adminUser.id,
            action: "create_user",
            target_type: "user",
            target_id: match.id,
            payload: { admin_notes, existing_auth: true },
          });
          return NextResponse.json({ user_id: match.id, invited: false });
        }
      }
      console.error("createUser error:", createError);
      return NextResponse.json(
        { error: createError.message ?? "Failed to create user" },
        { status: 500 }
      );
    }

    const newUserId = createData?.user?.id;
    if (!newUserId) {
      return NextResponse.json({ error: "User created but no id returned" }, { status: 500 });
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    const resetPath = `${appUrl}/login/reset-password`;
    // Redirect URL must be in Supabase Dashboard → Authentication → URL Configuration → Redirect URLs

    // Generate recovery (set-password) link; we send it ourselves via Resend (no Supabase email)
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: resetPath, redirect_to: resetPath },
    });

    let actionLinkFromResponse: string | undefined =
      (linkData as { properties?: { action_link?: string }; action_link?: string })?.properties?.action_link ??
      (linkData as { action_link?: string })?.action_link;

    if (actionLinkFromResponse && !actionLinkFromResponse.includes("redirect_to=") && resetPath) {
      const sep = actionLinkFromResponse.includes("?") ? "&" : "?";
      actionLinkFromResponse = `${actionLinkFromResponse}${sep}redirect_to=${encodeURIComponent(resetPath)}`;
    }
    // #region agent log
    if (actionLinkFromResponse) {
      const urlObj = new URL(actionLinkFromResponse);
      fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "a0a29d" },
        body: JSON.stringify({
          sessionId: "a0a29d",
          location: "app/api/admin/sellers/route.ts:recoveryLink",
          message: "Recovery link built",
          data: {
            redirectToUsed: resetPath,
            verifyHost: urlObj.origin,
            hasRedirectInLink: actionLinkFromResponse.includes("redirect_to="),
          },
          timestamp: Date.now(),
          hypothesisId: "H3",
        }),
      }).catch(() => {});
    }
    // #endregion

    if (linkError || !actionLinkFromResponse) {
      console.error("generateLink error:", linkError);
      // User exists in auth and public.users will be inserted; they can use "Forgot password" to get a link
      const now = new Date().toISOString();
      await admin.from("users").insert({
        id: newUserId,
        email,
        role: "seller",
        first_name,
        surname,
        created_by_admin: true,
        invited_at: now,
        phone,
        updated_at: now,
      });
      await admin.from("admin_actions").insert({
        admin_id: adminUser.id,
        action: "create_user",
        target_type: "user",
        target_id: newUserId,
        payload: { admin_notes },
      });
      return NextResponse.json({
        user_id: newUserId,
        invited: false,
        warning: "User created but set-password link could not be generated. They can use Forgot password on the login page.",
      });
    }

    const actionLink = actionLinkFromResponse;
    const firstName = first_name?.trim() || "there";

    try {
      await sendEmail({
        type: "alert",
        to: email,
        subject: "You're invited to Teevo",
        variables: {
          title: "Set your password",
          subtitle: "You've been invited to Teevo",
          body: `Hi ${firstName}, click the button below to set your password and access your Teevo account.`,
          cta_link: actionLink,
          cta_text: "Set your password",
        },
      });
    } catch (e) {
      console.error("Invite email (Resend) failed:", e);
      // Still create the user; they can use Forgot password
      const now = new Date().toISOString();
      await admin.from("users").insert({
        id: newUserId,
        email,
        role: "seller",
        first_name,
        surname,
        created_by_admin: true,
        invited_at: now,
        phone,
        updated_at: now,
      });
      await admin.from("admin_actions").insert({
        admin_id: adminUser.id,
        action: "create_user",
        target_type: "user",
        target_id: newUserId,
        payload: { admin_notes },
      });
      return NextResponse.json({
        user_id: newUserId,
        invited: false,
        warning: "User created but invite email failed. They can use Forgot password on the login page.",
      });
    }

    const now = new Date().toISOString();
    const { error: insertError } = await admin.from("users").insert({
      id: newUserId,
      email,
      role: "seller",
      first_name,
      surname,
      created_by_admin: true,
      invited_at: now,
      phone,
      updated_at: now,
    });

    if (insertError) {
      console.error("users insert error:", insertError);
      return NextResponse.json({ error: insertError.message ?? "Failed to create user record" }, { status: 500 });
    }

    await admin.from("admin_actions").insert({
      admin_id: adminUser.id,
      action: "create_user",
      target_type: "user",
      target_id: newUserId,
      payload: { admin_notes },
    });

    return NextResponse.json({ user_id: newUserId, invited: true });
  } catch (e) {
    console.error("POST /api/admin/sellers error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
