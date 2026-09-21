/**
 * One-off: send redesigned no-activity Creator Weekly Roundup test email.
 * Usage: npx tsx --env-file=.env.local scripts/send-creator-weekly-roundup-test.ts
 */
import { createClient } from "@supabase/supabase-js";
import { buildCreatorWeeklyRoundupNoActivityEmail } from "../lib/creator/weekly-roundup";
import { sendEmail } from "../lib/email";
import { referralShareUrl } from "../lib/referral/codes";
import { DEFAULT_REFERRAL_SETTINGS, getReferralSettings } from "../lib/referral/settings";

const TO = process.env.CREATOR_WEEKLY_ROUNDUP_TEST_TO?.trim() || "david@teevohq.com";
/** Prefer production links in preview emails so CTAs work outside localhost. */
const PREVIEW_ORIGIN = "https://app.teevohq.com";

async function main() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set");
  }

  let settings = { ...DEFAULT_REFERRAL_SETTINGS };
  let shareUrl = referralShareUrl("DAVID", PREVIEW_ORIGIN);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceKey) {
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    settings = await getReferralSettings(admin);

    const { data: creator } = await admin
      .from("creators")
      .select("id, referral_codes(code), users:user_id(email)")
      .eq("status", "active")
      .not("user_id", "is", null)
      .limit(1)
      .maybeSingle();

    const codeRel = creator?.referral_codes as unknown as
      | { code?: string }
      | { code?: string }[]
      | null;
    const codeObj = Array.isArray(codeRel) ? codeRel[0] : codeRel;
    if (codeObj?.code) {
      shareUrl = referralShareUrl(codeObj.code, PREVIEW_ORIGIN);
      console.log(`Using live creator code: ${codeObj.code}`);
    } else {
      console.warn("No active creator code found — using sample /r/DAVID link");
    }
  } else {
    console.warn("Supabase env missing — using DEFAULT_REFERRAL_SETTINGS");
  }

  const hubUrl = `${PREVIEW_ORIGIN}/dashboard/creator`;
  const content = buildCreatorWeeklyRoundupNoActivityEmail({
    settings,
    shareUrl,
    hubUrl,
  });

  console.log(`Sending no-activity weekly roundup test to ${TO}...`);
  console.log(`Subject: ${content.subject}`);
  console.log(`Primary CTA: ${content.cta_link}`);

  await sendEmail({
    type: "standard",
    to: TO,
    subject: `[TEST] ${content.subject}`,
    variables: {
      title: content.title,
      subtitle: content.subtitle,
      body: content.body,
      preheader: content.preheader,
      tip_block: content.tip_block,
      item_name: "Creator Hub",
      hero_image: "",
      cta_link: content.cta_link,
      cta_text: content.cta_text,
    },
  });

  console.log("Sent.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
