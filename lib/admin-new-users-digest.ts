/**
 * Daily admin digest of new Teevo user registrations (Europe/London schedule).
 * Structured so additional digest sections can be added later.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAppUrl } from "@/lib/app-env";
import { LONDON_TZ, londonDateString } from "@/lib/business-days";
import { ensureEmailSent, EmailTriggerType } from "@/lib/email-triggers";
import { getAdminAlertEmail } from "@/lib/fulfilment-emails";

const DIGEST_HOUR_LONDON = 18;

const USER_SELECT =
  "id, email, first_name, surname, display_name, created_at, founding_seller_rank, founder_joined_at, founder_reward_status, role, created_by_admin";

type DigestUser = {
  id: string;
  email: string;
  first_name: string | null;
  surname: string | null;
  display_name: string | null;
  created_at: string;
  founding_seller_rank: number | null;
  founder_joined_at?: string | null;
  founder_reward_status?: "none" | "eligible" | "earned" | null;
  role?: string | null;
  created_by_admin?: boolean | null;
};

type ReferralInfo = {
  code: string | null;
};

export type AdminNewUsersDigestResult = {
  sent: boolean;
  skipped?: "wrong_hour" | "no_admin_email" | "already_sent_today" | "no_pending" | "claimed_by_other";
  pendingCount?: number;
  claimedCount?: number;
  londonDate?: string;
};

function londonHour(date: Date): number {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON_TZ,
    hour: "2-digit",
    hourCycle: "h23",
  });
  const hourPart = fmt.formatToParts(date).find((p) => p.type === "hour");
  return Number(hourPart?.value ?? "0");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function displayName(user: DigestUser): string {
  const full = [user.first_name, user.surname].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (user.display_name?.trim()) return user.display_name.trim();
  return "Unknown";
}

function formatJoinedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    timeZone: LONDON_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

function digestReferenceId(londonDate: string): string {
  return `admin_new_users_digest:${londonDate}`;
}

async function loadReferralMap(
  admin: SupabaseClient,
  userIds: string[]
): Promise<Map<string, ReferralInfo>> {
  const map = new Map<string, ReferralInfo>();
  if (userIds.length === 0) return map;

  const { data, error } = await admin
    .from("referrals")
    .select("referred_user_id, referral_codes(code)")
    .in("referred_user_id", userIds);

  if (error) {
    console.error("admin-new-users-digest: referral lookup failed", error.message);
    return map;
  }

  for (const row of data ?? []) {
    const codeRel = row.referral_codes as unknown;
    const codeRow = (Array.isArray(codeRel) ? codeRel[0] : codeRel) as { code?: string } | null;
    map.set(row.referred_user_id as string, {
      code: codeRow?.code?.trim() || null,
    });
  }
  return map;
}

function buildDigestBody(
  users: DigestUser[],
  referrals: Map<string, ReferralInfo>
): { title: string; subtitle: string; body: string } {
  const n = users.length;
  const title = `${n} new ${n === 1 ? "person" : "people"} joined Teevo \uD83C\uDF89`;
  const subtitle = "Here's who joined since your last update:";

  const blocks = users.map((u) => {
    const referral = referrals.get(u.id);
    const lines = [
      `<strong>${escapeHtml(displayName(u))}</strong>`,
      escapeHtml(u.email || "(no email)"),
      `Joined: ${escapeHtml(formatJoinedAt(u.created_at))}`,
    ];
    if (referral) {
      lines.push(`Referred: yes${referral.code ? ` (${escapeHtml(referral.code)})` : ""}`);
    } else {
      lines.push("Referred: no");
    }
    if (u.founding_seller_rank != null) {
      lines.push(`Founder: #${u.founding_seller_rank}`);
    } else if (u.founder_reward_status && u.founder_reward_status !== "none") {
      lines.push(`Founder status: ${escapeHtml(u.founder_reward_status)}`);
    }
    return lines.join("<br />");
  });

  const body = [
    blocks.join("<br /><br />"),
    "",
    `<strong>${n} new ${n === 1 ? "user" : "users"} in total</strong>`,
  ].join("<br />");

  return { title, subtitle, body };
}

async function findPendingUsers(admin: SupabaseClient): Promise<DigestUser[]> {
  const { data, error } = await admin
    .from("users")
    .select(USER_SELECT)
    .is("admin_signup_digest_sent_at", null)
    .neq("role", "admin")
    .or("created_by_admin.is.null,created_by_admin.eq.false")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("admin-new-users-digest: pending query failed", error.message);
    throw new Error(error.message);
  }
  return (data ?? []) as DigestUser[];
}

async function claimUsers(
  admin: SupabaseClient,
  ids: string[],
  nowIso: string
): Promise<DigestUser[]> {
  if (ids.length === 0) return [];
  const { data, error } = await admin
    .from("users")
    .update({ admin_signup_digest_sent_at: nowIso })
    .in("id", ids)
    .is("admin_signup_digest_sent_at", null)
    .select(USER_SELECT);

  if (error) {
    console.error("admin-new-users-digest: claim failed", error.message);
    throw new Error(error.message);
  }
  return (data ?? []) as DigestUser[];
}

async function rollbackClaim(admin: SupabaseClient, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await admin
    .from("users")
    .update({ admin_signup_digest_sent_at: null })
    .in("id", ids);

  if (error) {
    console.error("admin-new-users-digest: rollback claim failed", error.message);
  }
}

async function alreadySentToday(admin: SupabaseClient, referenceId: string): Promise<boolean> {
  const { data } = await admin
    .from("sent_emails")
    .select("id")
    .eq("email_type", EmailTriggerType.ADMIN_NEW_USERS_DIGEST)
    .eq("reference_id", referenceId)
    .maybeSingle();
  return Boolean(data);
}

/**
 * Run the admin new-users digest. Safe to call from cron; DST-aware London hour gate.
 * Pass `force: true` to skip the hour gate (manual/dev runs).
 */
export async function runAdminNewUsersDigest(
  admin: SupabaseClient,
  opts: { now?: Date; force?: boolean } = {}
): Promise<AdminNewUsersDigestResult> {
  const now = opts.now ?? new Date();
  const londonDate = londonDateString(now);
  const referenceId = digestReferenceId(londonDate);

  console.log("admin-new-users-digest: started", { londonDate });

  if (!opts.force && londonHour(now) !== DIGEST_HOUR_LONDON) {
    console.log("admin-new-users-digest: skipped wrong_hour", {
      londonHour: londonHour(now),
      expected: DIGEST_HOUR_LONDON,
    });
    return { sent: false, skipped: "wrong_hour", londonDate };
  }

  const to = getAdminAlertEmail();
  if (!to) {
    console.log("admin-new-users-digest: skipped no_admin_email");
    return { sent: false, skipped: "no_admin_email", londonDate };
  }

  if (await alreadySentToday(admin, referenceId)) {
    console.log("admin-new-users-digest: skipped already_sent_today");
    return { sent: false, skipped: "already_sent_today", londonDate };
  }

  const pending = await findPendingUsers(admin);
  const pendingCount = pending.length;
  console.log("admin-new-users-digest: pending users", { pendingCount });

  if (pendingCount === 0) {
    return { sent: false, skipped: "no_pending", pendingCount: 0, londonDate };
  }

  const nowIso = now.toISOString();
  const claimed = await claimUsers(
    admin,
    pending.map((u) => u.id),
    nowIso
  );
  const claimedCount = claimed.length;
  console.log("admin-new-users-digest: claimed users", { claimedCount });

  if (claimedCount === 0) {
    return {
      sent: false,
      skipped: "claimed_by_other",
      pendingCount,
      claimedCount: 0,
      londonDate,
    };
  }

  // Keep newest-first after claim (update returning order is not guaranteed).
  claimed.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const claimedIds = claimed.map((u) => u.id);
  const referrals = await loadReferralMap(admin, claimedIds);
  const { title, subtitle, body } = buildDigestBody(claimed, referrals);
  const appUrl = getAppUrl();
  const n = claimedCount;

  try {
    const ok = await ensureEmailSent(admin, {
      emailType: EmailTriggerType.ADMIN_NEW_USERS_DIGEST,
      referenceId,
      referenceType: "user",
      recipientId: null,
      to,
      subject: `\uD83D\uDC4B New Teevo users \u2014 ${n} joined`,
      type: "alert",
      variables: {
        title,
        subtitle,
        body,
        hero_image: "",
        cta_link: `${appUrl}/admin/users`,
        cta_text: "View users",
      },
    });

    if (!ok) {
      // Day lock won by a concurrent run that already emailed; leave claims so users are not re-sent.
      console.log("admin-new-users-digest: ensureEmailSent already sent today; leaving claims");
      return {
        sent: false,
        skipped: "already_sent_today",
        pendingCount,
        claimedCount,
        londonDate,
      };
    }

    console.log("admin-new-users-digest: email sent", { claimedCount });
    console.log("admin-new-users-digest: users marked processed", { claimedCount });
    return { sent: true, pendingCount, claimedCount, londonDate };
  } catch (e) {
    console.error(
      "admin-new-users-digest: email failure",
      e instanceof Error ? e.message : e
    );
    await rollbackClaim(admin, claimedIds);
    throw e;
  }
}
