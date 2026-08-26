/**
 * Stripe Connect payouts setup reminder — notification + email
 * 24 hours after email confirmation, skipped if payouts already enabled.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { getAppUrl } from "@/lib/app-env";
import { ensureEmailSent, EmailTriggerType } from "@/lib/email-triggers";
import {
  createNotification,
  NotificationEntityType,
  NotificationType,
  resolveNotifications,
} from "@/lib/notifications";
import { assertStripeModeMatchesEnv } from "@/lib/stripe-env";
import { isStripeOnboardingComplete } from "@/lib/stripe-account";

const DAY_MS = 24 * 60 * 60 * 1000;
const BATCH_LIMIT = 40;

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  assertStripeModeMatchesEnv();
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" });
}

async function sellerHasCompletedPayouts(
  stripe: Stripe,
  stripeAccountId: string | null
): Promise<boolean> {
  if (!stripeAccountId) return false;
  try {
    const account = await stripe.accounts.retrieve(stripeAccountId);
    return isStripeOnboardingComplete(account);
  } catch (e) {
    console.error("stripe-setup-reminder: account retrieve failed", e);
    return false;
  }
}

export async function resolveStripeSetupReminder(
  admin: SupabaseClient,
  userId: string
): Promise<void> {
  await resolveNotifications(admin, {
    types: [NotificationType.STRIPE_PAYOUTS_SETUP_REQUIRED],
    entityId: userId,
    userId,
  });
  const now = new Date().toISOString();
  await admin
    .from("users")
    .update({ stripe_setup_reminder_sent_at: now, updated_at: now })
    .eq("id", userId)
    .is("stripe_setup_reminder_sent_at", null);
}

async function sendStripeSetupReminder(
  admin: SupabaseClient,
  user: {
    id: string;
    email: string;
    first_name: string | null;
  }
): Promise<"sent" | "email_failed"> {
  const appUrl = getAppUrl();
  const firstName = user.first_name?.trim() || "there";
  const ctaLink = appUrl ? `${appUrl}/onboarding/payouts` : "/onboarding/payouts";

  await createNotification(admin, {
    userId: user.id,
    type: NotificationType.STRIPE_PAYOUTS_SETUP_REQUIRED,
    title: "Set up payouts to sell",
    message:
      "Connect your bank details with Stripe so you can get paid when your clubs sell on Teevo.",
    entityType: NotificationEntityType.ACCOUNT,
    entityId: user.id,
    actionUrl: "/onboarding/payouts",
    actionLabel: "Set up payouts",
    requiresAction: true,
  });

  try {
    await ensureEmailSent(admin, {
      emailType: EmailTriggerType.KYC_INCOMPLETE_REMINDER,
      referenceId: user.id,
      referenceType: "user",
      recipientId: user.id,
      to: user.email,
      subject: "Set up payouts to sell on Teevo",
      type: "alert",
      variables: {
        title: "Set up payouts to sell",
        subtitle: "One quick step so you can get paid when your clubs sell.",
        body: `Hi ${firstName},\n\nYou're all set on Teevo — to sell clubs and receive payouts, finish connecting your bank details with Stripe (about 2 minutes).\n\nYou can do this any time from your dashboard.`,
        cta_link: ctaLink,
        cta_text: "Set up payouts",
      },
    });
  } catch (e) {
    console.error("stripe-setup-reminder: email failed", e);
    return "email_failed";
  }

  return "sent";
}

export type StripeSetupReminderCronResult = {
  candidates: number;
  sent: number;
  skippedComplete: number;
  skippedNoEmail: number;
  emailFailed: number;
};

/**
 * Find users confirmed ≥24h ago who have not yet received the reminder,
 * skip anyone with payouts already enabled, then notify + email.
 */
export async function runStripeSetupReminderCron(
  admin: SupabaseClient
): Promise<StripeSetupReminderCronResult> {
  const result: StripeSetupReminderCronResult = {
    candidates: 0,
    sent: 0,
    skippedComplete: 0,
    skippedNoEmail: 0,
    emailFailed: 0,
  };

  const cutoff = new Date(Date.now() - DAY_MS).toISOString();
  const { data: rows, error } = await admin
    .from("users")
    .select("id, email, first_name, stripe_account_id, email_confirmed_at")
    .is("stripe_setup_reminder_sent_at", null)
    .not("email_confirmed_at", "is", null)
    .lte("email_confirmed_at", cutoff)
    .order("email_confirmed_at", { ascending: true })
    .limit(BATCH_LIMIT);

  if (error) {
    console.error("stripe-setup-reminder: query failed", error);
    throw new Error(error.message);
  }

  const candidates = rows ?? [];
  result.candidates = candidates.length;
  if (!candidates.length) return result;

  const stripe = getStripe();
  const now = new Date().toISOString();

  for (const user of candidates) {
    if (!user.email?.trim()) {
      await admin
        .from("users")
        .update({ stripe_setup_reminder_sent_at: now, updated_at: now })
        .eq("id", user.id)
        .is("stripe_setup_reminder_sent_at", null);
      result.skippedNoEmail += 1;
      continue;
    }

    if (stripe) {
      const complete = await sellerHasCompletedPayouts(stripe, user.stripe_account_id);
      if (complete) {
        await resolveStripeSetupReminder(admin, user.id);
        result.skippedComplete += 1;
        continue;
      }
    }

    const outcome = await sendStripeSetupReminder(admin, {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
    });

    if (outcome === "email_failed") {
      result.emailFailed += 1;
      // Keep sent_at null so hourly cron retries; notification is idempotent.
      continue;
    }

    await admin
      .from("users")
      .update({ stripe_setup_reminder_sent_at: now, updated_at: now })
      .eq("id", user.id)
      .is("stripe_setup_reminder_sent_at", null);
    result.sent += 1;
  }

  return result;
}
