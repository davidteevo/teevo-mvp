/**
 * One-off: send redesigned creator onboarding test emails.
 * Usage: npx tsx --env-file=.env.local scripts/send-creator-onboarding-test.ts
 */
import { createClient } from "@supabase/supabase-js";
import { buildCreatorOnboardingEmailContent } from "../lib/creator/onboarding-email";
import { sendEmail } from "../lib/email";
import { DEFAULT_REFERRAL_SETTINGS, getReferralSettings } from "../lib/referral/settings";

const TO = process.env.CREATOR_ONBOARDING_TEST_TO?.trim() || "david@teevohq.com";

async function main() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set");
  }

  let settings = { ...DEFAULT_REFERRAL_SETTINGS };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceKey) {
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    settings = await getReferralSettings(admin);
  } else {
    console.warn("Supabase env missing — using DEFAULT_REFERRAL_SETTINGS");
  }

  const existing = buildCreatorOnboardingEmailContent({
    settings,
    firstName: "David",
    kind: "existing",
  });
  if ("error" in existing) throw new Error("Failed to build existing email");

  const neu = buildCreatorOnboardingEmailContent({
    settings,
    firstName: "David",
    kind: "new",
    accountActivationUrl: "https://app.teevohq.com/api/auth/set-password?token_hash=test-preview",
  });
  if ("error" in neu) throw new Error("Failed to build new email");

  console.log(`Sending existing-user onboarding test to ${TO}...`);
  await sendEmail({
    type: "creator-onboarding",
    to: TO,
    subject: `[TEST] ${existing.subject} (existing user)`,
    variables: {
      title: existing.title,
      body: existing.body.replace(/\n+/g, ""),
    },
  });
  console.log("Sent existing-user email.");

  console.log(`Sending new-user onboarding test to ${TO}...`);
  await sendEmail({
    type: "creator-onboarding",
    to: TO,
    subject: `[TEST] ${neu.subject} (new account)`,
    variables: {
      title: neu.title,
      body: neu.body.replace(/\n+/g, ""),
    },
  });
  console.log("Sent new-account email.");
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
