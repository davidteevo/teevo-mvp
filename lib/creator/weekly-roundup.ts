/**
 * Weekly Creator Roundup email (Europe/London, previous Mon–Sun).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getAppUrl } from "@/lib/app-env";
import { LONDON_TZ, londonDateString } from "@/lib/business-days";
import { fillMissionCallout } from "@/lib/creator/hub";
import { ensureEmailSent, EmailTriggerType } from "@/lib/email-triggers";
import { formatPoundsCompact } from "@/lib/pricing";
import { referralShareUrl } from "@/lib/referral/codes";
import { getReferralSettings } from "@/lib/referral/settings";
import { ReferralRewardType } from "@/lib/referral/types";

const ROUNDUP_HOUR_LONDON = 9;

const CREATOR_REWARD_TYPES = [
  ReferralRewardType.CREATOR_NEW_USER_REWARD,
  ReferralRewardType.CREATOR_LISTING_REWARD,
  ReferralRewardType.CREATOR_TRANSACTION_REWARD,
];

export type CreatorWeeklyRoundupResult = {
  sent: number;
  skipped?: string;
  weekKey?: string;
  eligible?: number;
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

function londonWeekdayShort(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON_TZ,
    weekday: "short",
  }).format(date);
}

/** Previous reporting week: Mon 00:00 → Sun 23:59:59.999 Europe/London, returned as UTC ISO bounds. */
export function previousLondonWeekBounds(now = new Date()): {
  weekKey: string;
  startIso: string;
  endIso: string;
  monthStartIso: string;
} {
  // Find this week's Monday in London, then subtract 7 days for previous Monday.
  const todayLondon = londonDateString(now);
  const [y, m, d] = todayLondon.split("-").map(Number) as [number, number, number];
  // Approximate weekday using noon UTC on that London calendar date
  const probe = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const weekday = londonWeekdayShort(probe); // Mon..Sun
  const weekdayIndex: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  const offsetFromMonday = weekdayIndex[weekday] ?? 0;
  const thisMonday = new Date(Date.UTC(y, m - 1, d - offsetFromMonday, 0, 0, 0));
  const prevMonday = new Date(thisMonday.getTime() - 7 * 24 * 60 * 60 * 1000);
  const prevSundayEnd = new Date(thisMonday.getTime() - 1);

  // Convert London calendar midnights via formatter — use ISO date parts for week key
  const prevMonLondon = londonDateString(new Date(prevMonday.getTime() + 12 * 60 * 60 * 1000));
  const weekKey = prevMonLondon;

  // Bounds: start of prev Monday London → end of prev Sunday London
  // Represent as UTC instants approximating London day edges (DST-safe enough for cron reporting)
  const startIso = londonDayStartUtc(prevMonLondon).toISOString();
  const endLondon = londonDateString(new Date(prevSundayEnd.getTime() + 12 * 60 * 60 * 1000));
  const endIso = londonDayEndUtc(endLondon).toISOString();

  const monthStart = `${prevMonLondon.slice(0, 7)}-01`;
  const monthStartIso = londonDayStartUtc(monthStart).toISOString();

  return { weekKey, startIso, endIso, monthStartIso };
}

function londonDayStartUtc(isoDate: string): Date {
  // Interpret as 00:00 London by probing with Temporal-like offset via toLocaleString
  const guess = new Date(`${isoDate}T00:00:00Z`);
  const asLondon = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(guess);
  // Binary-search offset by adjusting hours until london date+hour is isoDate 00
  let t = Date.parse(`${isoDate}T00:00:00.000Z`);
  for (let i = 0; i < 48; i++) {
    const d = new Date(t);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: LONDON_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(d);
    const y = parts.find((p) => p.type === "year")?.value;
    const mo = parts.find((p) => p.type === "month")?.value;
    const da = parts.find((p) => p.type === "day")?.value;
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    const dateStr = `${y}-${mo}-${da}`;
    if (dateStr === isoDate && h === 0) return d;
    if (dateStr > isoDate || (dateStr === isoDate && h > 0)) t -= 30 * 60 * 1000;
    else t += 30 * 60 * 1000;
  }
  void asLondon;
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function londonDayEndUtc(isoDate: string): Date {
  const start = londonDayStartUtc(isoDate);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function countable(status: string): boolean {
  return status === "approved" || status === "paid" || status === "pending";
}

export async function runCreatorWeeklyRoundup(
  admin: SupabaseClient,
  opts?: { force?: boolean; now?: Date }
): Promise<CreatorWeeklyRoundupResult> {
  const now = opts?.now ?? new Date();
  const force = opts?.force === true;

  if (!force) {
    if (londonWeekdayShort(now) !== "Mon") {
      return { sent: 0, skipped: "wrong_day" };
    }
    if (londonHour(now) !== ROUNDUP_HOUR_LONDON) {
      return { sent: 0, skipped: "wrong_hour" };
    }
  }

  const settings = await getReferralSettings(admin);
  if (!settings.creatorEnabled) {
    return { sent: 0, skipped: "programme_disabled" };
  }

  const { weekKey, startIso, endIso, monthStartIso } = previousLondonWeekBounds(now);
  const appUrl = getAppUrl();

  const { data: creators } = await admin
    .from("creators")
    .select("id, user_id, name, referral_code_id, referral_codes(code), users:user_id(email, first_name)")
    .eq("status", "active")
    .not("user_id", "is", null);

  const eligible = creators ?? [];
  let sent = 0;

  for (const creator of eligible) {
    const userId = creator.user_id as string;
    const userRel = creator.users as unknown as
      | { email?: string; first_name?: string }
      | { email?: string; first_name?: string }[]
      | null;
    const user = Array.isArray(userRel) ? userRel[0] : userRel;
    const email = user?.email?.trim();
    if (!email) continue;

    const codeRel = creator.referral_codes as unknown as
      | { code?: string }
      | { code?: string }[]
      | null;
    const codeObj = Array.isArray(codeRel) ? codeRel[0] : codeRel;
    const code = codeObj?.code;
    if (!code) continue;

    const shareUrl = referralShareUrl(code);
    const referenceId = `creator_weekly_roundup:${creator.id}:${weekKey}`;

    const { data: referrals } = await admin
      .from("referrals")
      .select("id, attributed_at, created_at")
      .eq("creator_id", creator.id);

    const referralIds = (referrals ?? []).map((r) => r.id);
    const { data: rewards } = referralIds.length
      ? await admin
          .from("referral_rewards")
          .select("reward_type, amount_pence, status, created_at, approved_at, referral_id")
          .in("referral_id", referralIds)
          .in("reward_type", CREATOR_REWARD_TYPES)
      : { data: [] as { reward_type: string; amount_pence: number; status: string; created_at: string; approved_at: string | null; referral_id: string }[] };

    let weekJoined = 0;
    let weekListed = 0;
    let weekTx = 0;
    let weekEarned = 0;
    let monthReferred = 0;
    let monthEarned = 0;

    for (const r of referrals ?? []) {
      const joinedAt = r.attributed_at ?? r.created_at;
      if (joinedAt >= startIso && joinedAt <= endIso) weekJoined += 1;
      if (joinedAt >= monthStartIso) monthReferred += 1;
    }

    for (const rw of rewards ?? []) {
      if (!countable(rw.status)) continue;
      const ts = rw.approved_at ?? rw.created_at;
      if (ts >= monthStartIso) monthEarned += rw.amount_pence;
      if (ts < startIso || ts > endIso) continue;
      weekEarned += rw.amount_pence;
      if (rw.reward_type === ReferralRewardType.CREATOR_NEW_USER_REWARD) {
        /* join counted from referrals */
      } else if (rw.reward_type === ReferralRewardType.CREATOR_LISTING_REWARD) {
        weekListed += 1;
      } else if (rw.reward_type === ReferralRewardType.CREATOR_TRANSACTION_REWARD) {
        weekTx += 1;
      }
    }

    const hasActivity = weekJoined > 0 || weekListed > 0 || weekTx > 0 || weekEarned > 0;
    const hubUrl = `${appUrl}/dashboard/creator`;
    const missionTitle = escapeHtml(settings.creatorMissionTitle);
    const missionBody = escapeHtml(settings.creatorMissionBody);
    const callout = escapeHtml(fillMissionCallout(settings.creatorMissionRewardCallout, settings));
    const ctaBlock = [
      `<p style="margin:24px 0 8px;"><a href="${escapeHtml(hubUrl)}" style="display:inline-block;padding:12px 20px;background:#265C4B;color:#FDFCF5;border-radius:10px;text-decoration:none;font-weight:600;">${hasActivity ? "Open Creator Hub" : "Share my Creator Link"}</a></p>`,
      `<p style="margin:0;"><a href="${escapeHtml(shareUrl)}">Share Teevo</a></p>`,
    ].join("");

    let title: string;
    let subtitle: string;
    let body: string;

    if (hasActivity) {
      title = `Your Teevo Creator week \u26F3`;
      subtitle = `You earned ${formatPoundsCompact(weekEarned)} this week \uD83C\uDF89`;
      body = [
        `<p>Here's what happened:</p>`,
        `<ul>`,
        `<li>\uD83D\uDC4B <strong>${weekJoined}</strong> golfer${weekJoined === 1 ? "" : "s"} joined through you</li>`,
        `<li>\uD83C\uDFCC\uFE0F <strong>${weekListed}</strong> had their first listing approved</li>`,
        `<li>\uD83D\uDCB8 <strong>${weekTx}</strong> completed their first transaction</li>`,
        `<li>\uD83D\uDCB0 <strong>${escapeHtml(formatPoundsCompact(weekEarned))}</strong> earned</li>`,
        `</ul>`,
        `<p><strong>Your month so far</strong><br/>${monthReferred} golfers referred · ${escapeHtml(formatPoundsCompact(monthEarned))} earned</p>`,
        `<p><strong>\uD83C\uDFAF This week's Teevo mission</strong><br/><strong>${missionTitle}</strong><br/>${missionBody}</p>`,
        callout ? `<p>${callout}</p>` : "",
        ctaBlock,
      ].join("");
    } else {
      const listingLine =
        settings.creatorListingRewardEnabled && settings.creatorListingRewardPence > 0
          ? `\uD83C\uDFCC\uFE0F First approved listing = <strong>${escapeHtml(formatPoundsCompact(settings.creatorListingRewardPence))}</strong>`
          : missionBody;
      title = `Ready for another week? \uD83D\uDE80`;
      subtitle = "Your Creator Link is ready to share.";
      body = [
        `<p><strong>\uD83C\uDFAF This week's Teevo mission</strong><br/><strong>${missionTitle}</strong></p>`,
        `<p>${listingLine}</p>`,
        ctaBlock,
      ].join("");
    }

    const didSend = await ensureEmailSent(admin, {
      emailType: EmailTriggerType.CREATOR_WEEKLY_ROUNDUP,
      referenceId,
      referenceType: "user",
      recipientId: userId,
      to: email,
      subject: hasActivity
        ? `Your Teevo Creator week — ${formatPoundsCompact(weekEarned)} earned`
        : "Ready for another Teevo Creator week?",
      type: "standard",
      variables: {
        title,
        subtitle,
        body,
        item_name: "Creator Hub",
        order_number: weekKey,
        hero_image: "",
        cta_link: hubUrl,
        cta_text: hasActivity ? "Open Creator Hub" : "Share my Creator Link",
      },
    });

    if (didSend) sent += 1;
  }

  return { sent, weekKey, eligible: eligible.length };
}
