import type { SupabaseClient } from "@supabase/supabase-js";
import { getAppUrl } from "@/lib/app-env";
import { buildCreatorObjectiveCopy } from "@/lib/creator/objective";
import { EmailTriggerType, ensureEmailSent } from "@/lib/email-triggers";
import { getReferralSettings } from "@/lib/referral/settings";
import { trackServerEvent } from "@/lib/starter-pack";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function appBaseUrl(): string {
  const raw = getAppUrl();
  return raw.toLowerCase().includes("placeholder") ? "https://app.teevohq.com" : raw;
}

function ctaButton(href: string, label: string): string {
  return [
    `<table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:20px 0 8px;">`,
    `<tr><td align="center">`,
    `<a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 22px;background:#265C4B;color:#FDFCF5;border-radius:10px;text-decoration:none;font-weight:600;font-size:16px;line-height:1.3;">${escapeHtml(label)}</a>`,
    `</td></tr></table>`,
  ].join("");
}

function incentiveCard(opts: {
  eyebrow: string;
  title: string;
  example: string;
}): string {
  return [
    `<table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:20px 0;border-radius:14px;background:#265C4B;">`,
    `<tr><td style="padding:22px 18px;text-align:center;font-family:'Fredoka',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">`,
    `<p style="margin:0 0 8px;font-size:11px;letter-spacing:0.08em;font-weight:600;color:#FFD25E;">${escapeHtml(opts.eyebrow)}</p>`,
    `<p style="margin:0 0 10px;font-size:24px;line-height:1.25;font-weight:700;color:#FDFCF5;">${escapeHtml(opts.title)}</p>`,
    `<p style="margin:0;font-size:15px;line-height:1.4;color:#FDFCF5;">${escapeHtml(opts.example)}</p>`,
    `</td></tr></table>`,
  ].join("");
}

function quickStartCard(text: string): string {
  return [
    `<table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:20px 0;border-radius:12px;background:#FFD25E;">`,
    `<tr><td style="padding:16px 18px;font-family:'Fredoka',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">`,
    `<p style="margin:0 0 6px;font-size:11px;letter-spacing:0.08em;font-weight:700;color:#265C4B;">QUICK START</p>`,
    `<p style="margin:0;font-size:15px;line-height:1.4;font-weight:600;color:#265C4B;">${escapeHtml(text)}</p>`,
    `</td></tr></table>`,
  ].join("");
}

function paragraphsFromText(text: string): string {
  return text
    .split(/\n\n+/)
    .map(
      (p) =>
        `<p style="margin:0 0 12px;font-size:16px;line-height:1.5;color:#265C4B;">${escapeHtml(p).replace(/\n/g, "<br />")}</p>`
    )
    .join("");
}

function smallPrint(text: string): string {
  return `<p style="margin:24px 0 0;font-size:11px;line-height:1.45;color:#265C4B;opacity:0.65;">${escapeHtml(text)}</p>`;
}

export type CreatorOnboardingEmailKind = "existing" | "new";

export type SendCreatorOnboardingEmailResult = {
  sent: boolean;
  kind: CreatorOnboardingEmailKind;
  skippedReason?: string;
};

/**
 * Send Email A (existing Teevo user) or Email B (new account) once per creator.
 * Idempotent via ensureEmailSent(reference_id = creator.id).
 */
export async function sendCreatorOnboardingEmail(
  admin: SupabaseClient,
  opts: {
    creatorId: string;
    userId: string;
    email: string;
    firstName?: string | null;
    referralCode?: string | null;
    kind: CreatorOnboardingEmailKind;
    accountActivationUrl?: string | null;
  }
): Promise<SendCreatorOnboardingEmailResult> {
  const settings = await getReferralSettings(admin);
  const copy = buildCreatorObjectiveCopy(settings);
  const firstName = (opts.firstName ?? "").trim() || "there";
  const hubUrl = `${appBaseUrl()}/dashboard/creator`;

  const emailType =
    opts.kind === "existing"
      ? EmailTriggerType.CREATOR_ONBOARDING_EXISTING
      : EmailTriggerType.CREATOR_ONBOARDING_NEW;

  let title: string;
  let subtitle: string;
  let subject: string;
  let body: string;
  let primaryCtaUrl: string;
  let primaryCtaLabel: string;

  if (opts.kind === "existing") {
    subject = "You're now a Teevo Creator \uD83C\uDF89";
    title = "You're now a Teevo Creator";
    subtitle = "Earn rewards by helping us grow Teevo.";
    primaryCtaUrl = hubUrl;
    primaryCtaLabel = "Open my Creator Hub";
    body = [
      `<p style="margin:0 0 12px;font-size:16px;line-height:1.5;color:#265C4B;">Hey ${escapeHtml(firstName)},</p>`,
      `<p style="margin:0 0 4px;font-size:16px;line-height:1.5;color:#265C4B;">You're in — you've officially joined the <strong>Teevo Creator Programme</strong>. \uD83C\uDF89</p>`,
      incentiveCard({
        eyebrow: copy.incentiveEyebrow,
        title: copy.incentiveTitle,
        example: copy.exampleReward,
      }),
      paragraphsFromText(copy.onboardingWhatToDo),
      ctaButton(primaryCtaUrl, primaryCtaLabel),
      `<p style="margin:16px 0 8px;font-size:16px;line-height:1.5;font-weight:600;color:#265C4B;">${escapeHtml(copy.onboardingFirstAction)}</p>`,
      `<p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#265C4B;">${escapeHtml(copy.onboardingSecondaryShare)}</p>`,
      quickStartCard(copy.onboardingQuickStart),
      `<p style="margin:24px 0 0;font-size:16px;line-height:1.5;color:#265C4B;">Thanks for being part of it.</p>`,
      `<p style="margin:8px 0 0;font-size:16px;line-height:1.5;color:#265C4B;">David<br/>Founder, Teevo</p>`,
      smallPrint(copy.qualificationText),
    ].join("");
  } else {
    const activationUrl = (opts.accountActivationUrl ?? "").trim();
    if (!activationUrl) {
      return {
        sent: false,
        kind: "new",
        skippedReason: "missing_activation_url",
      };
    }
    subject = "Welcome to the Teevo Creator Programme \uD83D\uDC4B";
    title = "Welcome to the Teevo Creator Programme";
    subtitle = "Your creator rewards are waiting.";
    primaryCtaUrl = activationUrl;
    primaryCtaLabel = "Activate my Teevo account";
    body = [
      `<p style="margin:0 0 12px;font-size:16px;line-height:1.5;color:#265C4B;">Hey ${escapeHtml(firstName)},</p>`,
      `<p style="margin:0 0 12px;font-size:16px;line-height:1.5;color:#265C4B;">Welcome to <strong>Teevo — and to the Teevo Creator Programme.</strong> \uD83D\uDC4B</p>`,
      `<p style="margin:0 0 4px;font-size:16px;line-height:1.5;color:#265C4B;">You're joining us at the very beginning, and we want to reward you for helping us grow the marketplace.</p>`,
      incentiveCard({
        eyebrow: copy.incentiveEyebrow,
        title: copy.incentiveTitle,
        example: copy.exampleReward,
      }),
      paragraphsFromText(copy.onboardingWhatToDo),
      `<p style="margin:0 0 12px;font-size:16px;line-height:1.5;color:#265C4B;">Activate your account to get your unique creator link and open your Creator Hub.</p>`,
      ctaButton(primaryCtaUrl, primaryCtaLabel),
      `<p style="margin:16px 0 8px;font-size:16px;line-height:1.5;font-weight:600;color:#265C4B;">${escapeHtml(copy.onboardingFirstAction)}</p>`,
      `<p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#265C4B;">${escapeHtml(copy.onboardingSecondaryShare)}</p>`,
      quickStartCard(copy.onboardingQuickStart),
      `<p style="margin:24px 0 0;font-size:16px;line-height:1.5;color:#265C4B;">Great to have you involved.</p>`,
      `<p style="margin:8px 0 0;font-size:16px;line-height:1.5;color:#265C4B;">David<br/>Founder, Teevo</p>`,
      smallPrint(copy.qualificationText),
    ].join("");
  }

  // Avoid sendEmail turning structural newlines into <br> inside tags — body is already HTML.
  const compactBody = body.replace(/\n+/g, "");

  let sent = false;
  try {
    sent = await ensureEmailSent(admin, {
      emailType,
      referenceId: opts.creatorId,
      referenceType: "creator",
      recipientId: opts.userId,
      to: opts.email,
      subject,
      type: "standard",
      variables: {
        title,
        subtitle,
        body: compactBody,
        item_name: "Creator Programme",
        order_number: opts.creatorId.slice(0, 8),
        cta_link: primaryCtaUrl,
        cta_text: primaryCtaLabel,
      },
    });
  } catch (e) {
    console.error("creator onboarding email failed", e);
    return { sent: false, kind: opts.kind, skippedReason: "send_failed" };
  }

  if (sent) {
    await trackServerEvent(admin, "creator_onboarding_email_sent", {
      userId: opts.userId,
      properties: {
        creatorId: opts.creatorId,
        objective: copy.objective,
        rewardAmountPence: copy.rewardPence,
        emailType: opts.kind,
      },
    });
  }

  return {
    sent,
    kind: opts.kind,
    skippedReason: sent ? undefined : "already_sent",
  };
}

/**
 * Generate a set-password / account activation URL for a newly created auth user.
 */
export async function generateCreatorAccountActivationUrl(
  admin: SupabaseClient,
  email: string
): Promise<string | null> {
  const appUrl = appBaseUrl();
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${appUrl}/login/reset-password` },
  });
  if (linkError) return null;

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

  if (tokenForApi) {
    return `${appUrl}/api/auth/set-password?token_hash=${encodeURIComponent(tokenForApi)}`;
  }
  if (actionLinkFromResponse) {
    const sep = actionLinkFromResponse.includes("?") ? "&" : "?";
    return `${actionLinkFromResponse}${sep}redirect_to=${encodeURIComponent(`${appUrl}/login/reset-password`)}`;
  }
  return null;
}
