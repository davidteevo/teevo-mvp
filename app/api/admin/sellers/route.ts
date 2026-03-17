import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/admin/sellers
 * Admin-only. Body: first_name, last_name (surname), email, phone? (optional), admin_notes? (optional).
 * Creates auth user via inviteUserByEmail, inserts public.users with created_by_admin, logs to admin_actions.
 * If user with email already exists, returns 409 with existing user id.
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

    // Create auth user via invite (Supabase sends invite email; user sets password via link)
    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        first_name: first_name ?? undefined,
        surname: surname ?? undefined,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/login`,
    });

    if (inviteError) {
      // Duplicate: auth user might already exist from a previous invite
      if (inviteError.message?.toLowerCase().includes("already") || inviteError.message?.toLowerCase().includes("exists")) {
        const { data: authByEmail } = await admin.auth.admin.listUsers();
        const match = authByEmail?.users?.find((u) => u.email?.toLowerCase() === email);
        if (match) {
          const { data: pubUser } = await admin.from("users").select("id").eq("id", match.id).single();
          if (pubUser) {
            return NextResponse.json(
              { error: "User already exists with this email", existing_user_id: match.id },
              { status: 409 }
            );
          }
          // Auth user exists but no public.users row - insert one
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
      console.error("inviteUserByEmail error:", inviteError);
      return NextResponse.json(
        { error: inviteError.message ?? "Failed to send invite" },
        { status: 500 }
      );
    }

    const newUserId = inviteData?.user?.id;
    if (!newUserId) {
      return NextResponse.json({ error: "Invite sent but no user id returned" }, { status: 500 });
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
