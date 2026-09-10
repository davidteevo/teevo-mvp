import type { SupabaseClient } from "@supabase/supabase-js";
import { getAppUrl } from "@/lib/app-env";
import { buildCreatorObjectiveCopy, type CreatorObjectiveCopy } from "@/lib/creator/objective";
import { EmailTriggerType, ensureEmailSent } from "@/lib/email-triggers";
import {
  getReferralSettings,
  isCreatorBrandPackAvailable,
  type ReferralSettings,
} from "@/lib/referral/settings";
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
    `<table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:16px 0 12px;">`,
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
    `<table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:14px 0 12px;border-radius:14px;background:#265C4B;">`,
    `<tr><td style="padding:20px 18px;text-align:center;font-family:'Fredoka',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">`,
    `<p style="margin:0 0 8px;font-size:11px;letter-spacing:0.08em;font-weight:600;color:#FFD25E;">${escapeHtml(opts.eyebrow)}</p>`,
    `<p style="margin:0 0 8px;font-size:24px;line-height:1.25;font-weight:700;color:#FDFCF5;">${escapeHtml(opts.title)}</p>`,
    `<p style="margin:0;font-size:15px;line-height:1.4;color:#FDFCF5;">${escapeHtml(opts.example)}</p>`,
    `</td></tr></table>`,
  ].join("");
}

function p(text: string, style = "margin:0 0 10px;font-size:16px;line-height:1.5;color:#265C4B;"): string {
  return `<p style="${style}">${text}</p>`;
}

function smallPrint(text: string): string {
  return `<p style="margin:16px 0 0;font-size:11px;line-height:1.45;color:#265C4B;opacity:0.65;">${escapeHtml(text)}</p>`;
}

function howLinkWorksHtml(copy: CreatorObjectiveCopy, kind: CreatorOnboardingEmailKind): string {
  const amount = escapeHtml(copy.rewardAmount);
  const asCreator = kind === "existing" ? "As a creator, you have your own unique referral link." : "Once your account is active, you'll have your own unique referral link.";

  if (copy.objective === "new_users") {
    return p(
      `${asCreator} When someone joins Teevo through your link, you earn ${amount}.`
    );
  }
  if (copy.objective === "transactions") {
    return p(
      `${asCreator} When someone joins through your link and completes a qualifying transaction, you earn ${amount}.`
    );
  }
  return p(
    `${asCreator} When someone joins Teevo through your link and completes a qualifying successful listing, you earn ${amount}.`
  );
}

function priorityLineHtml(copy: CreatorObjectiveCopy): string {
  if (copy.objective === "new_users") {
    return p(
      "Right now, one of our biggest priorities is bringing more golfers onto Teevo."
    );
  }
  if (copy.objective === "transactions") {
    return p(
      "Right now, one of our biggest priorities is helping more golfers buy and sell great equipment on Teevo."
    );
  }
  return p(
    "Right now, one of our biggest priorities is getting more great golf equipment onto Teevo."
  );
}

function missionBridgeHtml(copy: CreatorObjectiveCopy): string {
  if (copy.objective === "new_users") {
    return p(
      "But the Creator Programme is about more than bringing new golfers onto Teevo.",
      "margin:14px 0 10px;font-size:16px;line-height:1.5;color:#265C4B;"
    );
  }
  if (copy.objective === "transactions") {
    return p(
      "But the Creator Programme is about more than driving transactions on Teevo.",
      "margin:14px 0 10px;font-size:16px;line-height:1.5;color:#265C4B;"
    );
  }
  return p(
    "But the Creator Programme is about more than bringing new listings onto Teevo.",
    "margin:14px 0 10px;font-size:16px;line-height:1.5;color:#265C4B;"
  );
}

function missionBlockHtml(): string {
  return [
    p(
      "We're building towards a future where golfers no longer have to guess which clubs are right for them — where every purchase of second-hand equipment can be better tailored to the golfer and their game."
    ),
    p("To get there, we first need to build a great marketplace."),
    p(
      "And great marketplaces aren't built by the company alone. They're built by their communities."
    ),
    p(
      "Every golfer you introduce and every new piece of equipment listed makes Teevo more useful for the next person who arrives. That's why creators are such an important part of what we're building."
    ),
    p(
      "You already have something we can't manufacture through advertising: the trust of your audience. You know how to speak to golfers, what they care about and how to introduce Teevo in a way that feels genuine."
    ),
    p(
      "We want you to feel like you're part of building Teevo with us — not simply promoting it.",
      "margin:0 0 12px;font-size:16px;line-height:1.5;color:#265C4B;"
    ),
  ].join("");
}

function brandPackBlockHtml(brandPackUrl: string): string {
  return [
    p(
      "To help, we've put together the Teevo Creator Brand Pack, where you'll find our mission, logos, templates and approved creative assets you can use in your content."
    ),
    ctaButton(brandPackUrl, "View Brand Pack"),
  ].join("");
}

function founderSignOffHtml(): string {
  return [
    p(
      "Thanks for being part of what we're building. We're very glad to have you with us.",
      "margin:18px 0 6px;font-size:16px;line-height:1.5;color:#265C4B;"
    ),
    `<p style="margin:0;font-size:16px;line-height:1.5;color:#265C4B;">David<br/>Founder, Teevo</p>`,
  ].join("");
}

function firstChallengeHtml(copy: CreatorObjectiveCopy, kind: CreatorOnboardingEmailKind): string {
  const amountHint = ""; // amount already in reward card / how-link
  void amountHint;
  let challenge: string;
  if (copy.objective === "new_users") {
    challenge =
      "Your first challenge: share your link with 3 golfers who'd love Teevo.";
  } else if (copy.objective === "transactions") {
    challenge =
      "Your first challenge: share your link with 3 golfers ready to buy or upgrade.";
  } else {
    challenge =
      "Your first challenge: share your link with 3 golfers you know who have equipment they could sell.";
  }
  if (kind === "new") {
    challenge = challenge.replace(
      "Your first challenge:",
      "Your first challenge (after you activate):"
    );
  }
  return [
    p(escapeHtml(challenge), "margin:12px 0 8px;font-size:16px;line-height:1.5;font-weight:700;color:#265C4B;"),
    p(
      "Instagram Stories, WhatsApp groups, golf clubs and your own content are all great places to start.",
      "margin:0 0 4px;font-size:15px;line-height:1.5;color:#265C4B;"
    ),
  ].join("");
}

function buildOnboardingBody(opts: {
  firstName: string;
  kind: CreatorOnboardingEmailKind;
  copy: CreatorObjectiveCopy;
  primaryCtaUrl: string;
  primaryCtaLabel: string;
  brandPackUrl: string | null;
}): string {
  const { firstName, kind, copy, primaryCtaUrl, primaryCtaLabel, brandPackUrl } = opts;
  const welcome =
    kind === "existing"
      ? [
          p(`You're in — welcome to the Teevo Creator Programme.`),
          p(`We're excited to have you helping us build Teevo.`),
        ].join("")
      : [
          p(`Welcome to Teevo — and to the Teevo Creator Programme.`),
          p(`We're excited to have you helping us build Teevo.`),
        ].join("");

  return [
    p(`Hey ${escapeHtml(firstName)},`),
    welcome,
    incentiveCard({
      eyebrow: copy.incentiveEyebrow,
      title: copy.incentiveTitle,
      example: copy.exampleReward,
    }),
    priorityLineHtml(copy),
    howLinkWorksHtml(copy, kind),
    ctaButton(primaryCtaUrl, primaryCtaLabel),
    firstChallengeHtml(copy, kind),
    missionBridgeHtml(copy),
    missionBlockHtml(),
    brandPackUrl ? brandPackBlockHtml(brandPackUrl) : "",
    founderSignOffHtml(),
    smallPrint(copy.qualificationText),
  ].join("");
}

export type CreatorOnboardingEmailKind = "existing" | "new";

export type SendCreatorOnboardingEmailResult = {
  sent: boolean;
  kind: CreatorOnboardingEmailKind;
  skippedReason?: string;
};

function brandPackEmailUrl(settings: ReferralSettings): string | null {
  if (!isCreatorBrandPackAvailable(settings)) return null;
  return `${appBaseUrl()}/creator/brand-pack?source=email`;
}

/**
 * Build HTML variables for creator onboarding (shared by send + test preview).
 */
export function buildCreatorOnboardingEmailContent(opts: {
  settings: ReferralSettings;
  firstName?: string | null;
  kind: CreatorOnboardingEmailKind;
  accountActivationUrl?: string | null;
}): {
  subject: string;
  title: string;
  primaryCtaUrl: string;
  primaryCtaLabel: string;
  body: string;
  copy: CreatorObjectiveCopy;
} | { error: "missing_activation_url" } {
  const copy = buildCreatorObjectiveCopy(opts.settings);
  const firstName = (opts.firstName ?? "").trim() || "there";
  const hubUrl = `${appBaseUrl()}/dashboard/creator`;
  const brandPackUrl = brandPackEmailUrl(opts.settings);

  if (opts.kind === "existing") {
    const primaryCtaUrl = hubUrl;
    const primaryCtaLabel = "Open my Creator Hub";
    return {
      subject: "You're now a Teevo Creator \uD83C\uDF89",
      title: "You're now a Teevo Creator",
      primaryCtaUrl,
      primaryCtaLabel,
      copy,
      body: buildOnboardingBody({
        firstName,
        kind: "existing",
        copy,
        primaryCtaUrl,
        primaryCtaLabel,
        brandPackUrl,
      }),
    };
  }

  const activationUrl = (opts.accountActivationUrl ?? "").trim();
  if (!activationUrl) {
    return { error: "missing_activation_url" };
  }
  const primaryCtaLabel = "Activate my Teevo account";
  return {
    subject: "Welcome to the Teevo Creator Programme \uD83D\uDC4B",
    title: "Welcome to the Teevo Creator Programme",
    primaryCtaUrl: activationUrl,
    primaryCtaLabel,
    copy,
    body: buildOnboardingBody({
      firstName,
      kind: "new",
      copy,
      primaryCtaUrl: activationUrl,
      primaryCtaLabel,
      brandPackUrl,
    }),
  };
}

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
  const content = buildCreatorOnboardingEmailContent({
    settings,
    firstName: opts.firstName,
    kind: opts.kind,
    accountActivationUrl: opts.accountActivationUrl,
  });

  if ("error" in content) {
    return {
      sent: false,
      kind: "new",
      skippedReason: "missing_activation_url",
    };
  }

  const emailType =
    opts.kind === "existing"
      ? EmailTriggerType.CREATOR_ONBOARDING_EXISTING
      : EmailTriggerType.CREATOR_ONBOARDING_NEW;

  const compactBody = content.body.replace(/\n+/g, "");

  let sent = false;
  try {
    sent = await ensureEmailSent(admin, {
      emailType,
      referenceId: opts.creatorId,
      referenceType: "creator",
      recipientId: opts.userId,
      to: opts.email,
      subject: content.subject,
      type: "creator-onboarding",
      variables: {
        title: content.title,
        body: compactBody,
        item_name: "Creator Programme",
        order_number: opts.creatorId.slice(0, 8),
        // Kept for logging/compat; template does not render a second CTA.
        cta_link: content.primaryCtaUrl,
        cta_text: content.primaryCtaLabel,
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
        objective: content.copy.objective,
        rewardAmountPence: content.copy.rewardPence,
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
