import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import { generateDisplayNameFromFirstName } from "@/lib/public-seller-name";
import { getAppUrl } from "@/lib/app-env";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generateTempPassword(): string {
  return randomBytes(24).toString("hex");
}

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export type ResolveOrCreateUserResult =
  | {
      ok: true;
      userId: string;
      email: string;
      created: boolean;
      invited: boolean;
      linkedExisting: boolean;
      warning?: string;
      accountStatus: string | null;
    }
  | { ok: false; error: string; status: number };

/**
 * Find public.users by email, or create auth + public user (admin invite pattern).
 * Never emails a plaintext password; uses recovery / set-password when creating.
 */
export async function resolveOrCreateUserByEmail(
  admin: SupabaseClient,
  opts: {
    email: string;
    firstName?: string | null;
    surname?: string | null;
    adminId?: string | null;
    adminNotes?: string | null;
    sendInvite?: boolean;
  }
): Promise<ResolveOrCreateUserResult> {
  const email = opts.email.trim().toLowerCase();
  if (!email) return { ok: false, error: "Email is required", status: 400 };
  if (!EMAIL_REGEX.test(email)) return { ok: false, error: "Invalid email format", status: 400 };

  const first_name = opts.firstName?.trim() || null;
  const surname = opts.surname?.trim() || null;

  const { data: existing } = await admin
    .from("users")
    .select("id, email, account_status")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return {
      ok: true,
      userId: existing.id,
      email: existing.email ?? email,
      created: false,
      invited: false,
      linkedExisting: true,
      accountStatus: (existing.account_status as string | null) ?? "active",
    };
  }

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
    if (
      createError.message?.toLowerCase().includes("already") ||
      createError.message?.toLowerCase().includes("exists")
    ) {
      const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const match = listData?.users?.find((u) => u.email?.toLowerCase() === email);
      if (match) {
        const { data: pubUser } = await admin
          .from("users")
          .select("id, account_status")
          .eq("id", match.id)
          .maybeSingle();
        if (pubUser) {
          return {
            ok: true,
            userId: match.id,
            email,
            created: false,
            invited: false,
            linkedExisting: true,
            accountStatus: (pubUser.account_status as string | null) ?? "active",
          };
        }
        const now = new Date().toISOString();
        await admin.from("users").insert({
          id: match.id,
          email: match.email ?? email,
          role: "seller",
          first_name,
          surname,
          display_name: generateDisplayNameFromFirstName(first_name),
          created_by_admin: true,
          invited_at: now,
          email_confirmed_at: now,
          updated_at: now,
        });
        if (opts.adminId) {
          await admin.from("admin_actions").insert({
            admin_id: opts.adminId,
            action: "create_user",
            target_type: "user",
            target_id: match.id,
            payload: { admin_notes: opts.adminNotes, existing_auth: true, source: "creator" },
          });
        }
        return {
          ok: true,
          userId: match.id,
          email,
          created: true,
          invited: false,
          linkedExisting: false,
          accountStatus: "active",
        };
      }
    }
    return { ok: false, error: createError.message ?? "Failed to create user", status: 500 };
  }

  const newUserId = createData?.user?.id;
  if (!newUserId) {
    return { ok: false, error: "User created but no id returned", status: 500 };
  }

  const rawAppUrl = getAppUrl();
  const appUrl = rawAppUrl.toLowerCase().includes("placeholder")
    ? "https://app.teevohq.com"
    : rawAppUrl;

  let invited = false;
  let warning: string | undefined;

  if (opts.sendInvite !== false) {
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${appUrl}/login/reset-password` },
    });

    const hashedToken =
      (linkData as { properties?: { hashed_token?: string }; hashed_token?: string })?.properties
        ?.hashed_token ?? (linkData as { hashed_token?: string })?.hashed_token;

    const actionLinkFromResponse =
      (linkData as { properties?: { action_link?: string }; action_link?: string })?.properties
        ?.action_link ?? (linkData as { action_link?: string })?.action_link;

    let tokenForApi: string | undefined = hashedToken;
    if (!tokenForApi && actionLinkFromResponse) {
      try {
        const verifyUrl = new URL(actionLinkFromResponse);
        tokenForApi =
          verifyUrl.searchParams.get("token_hash") ?? verifyUrl.searchParams.get("token") ?? undefined;
      } catch {
        // ignore
      }
    }

    let actionLink: string | undefined;
    if (tokenForApi) {
      actionLink = `${appUrl}/api/auth/set-password?token_hash=${encodeURIComponent(tokenForApi)}`;
    } else if (actionLinkFromResponse) {
      const sep = actionLinkFromResponse.includes("?") ? "&" : "?";
      actionLink = `${actionLinkFromResponse}${sep}redirect_to=${encodeURIComponent(`${appUrl}/login/reset-password`)}`;
    }

    if (linkError || !actionLink) {
      warning =
        "User created but set-password link could not be generated. They can use Forgot password on the login page.";
    } else {
      const firstName = first_name?.trim() || "there";
      try {
        await sendEmail({
          type: "alert",
          to: email,
          subject: "\u26F3 You\u2019re invited to join Teevo",
          variables: {
            title: "You're invited to join Teevo",
            subtitle: "Set your password to get started.",
            body: `Hi ${firstName}, you've been invited to Teevo as a creator partner.\n\nClick the button below to set your password and access your account.`,
            cta_link: actionLink,
            cta_text: "Set your password",
          },
        });
        invited = true;
      } catch (e) {
        console.error("Creator invite email failed:", e);
        warning =
          "User created but invite email failed. They can use Forgot password on the login page.";
      }
    }
  }

  const now = new Date().toISOString();
  const { error: insertError } = await admin.from("users").insert({
    id: newUserId,
    email,
    role: "seller",
    first_name,
    surname,
    display_name: generateDisplayNameFromFirstName(first_name),
    created_by_admin: true,
    invited_at: now,
    email_confirmed_at: now,
    updated_at: now,
  });

  if (insertError) {
    return { ok: false, error: insertError.message ?? "Failed to create user record", status: 500 };
  }

  if (opts.adminId) {
    await admin.from("admin_actions").insert({
      admin_id: opts.adminId,
      action: "create_user",
      target_type: "user",
      target_id: newUserId,
      payload: { admin_notes: opts.adminNotes, source: "creator" },
    });
  }

  return {
    ok: true,
    userId: newUserId,
    email,
    created: true,
    invited,
    linkedExisting: false,
    warning,
    accountStatus: "active",
  };
}
