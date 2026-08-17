import type { SupabaseClient } from "@supabase/supabase-js";
import { EmailTriggerType, ensureEmailSent, formatGbp } from "@/lib/email-triggers";
import { getAppUrl } from "@/lib/app-env";
import {
  createNotification,
  NotificationEntityType,
  NotificationType,
} from "@/lib/notifications";
import { ensureUserReferralCode, referralShareUrl } from "@/lib/referral/codes";
import { ReferralRewardType, type ReferralRewardTypeValue } from "@/lib/referral/types";

const appUrl = getAppUrl();

function copyForReward(rewardType: ReferralRewardTypeValue, amountGbp: string): {
  title: string;
  message: string;
  emailSubject: string;
  emailBody: string;
} {
  if (rewardType === ReferralRewardType.SELLER_LISTING_CREDIT) {
    return {
      title: `You've earned £${amountGbp}`,
      message: "Someone you referred has listed their first club.",
      emailSubject: `You've earned £${amountGbp} Teevo credit`,
      emailBody: `Someone you referred has listed their first club.<br /><br />We've added £${amountGbp} Teevo credit to your account.<br /><br />Use it towards your next club on Teevo.`,
    };
  }
  if (rewardType === ReferralRewardType.SELLER_SALE_CREDIT) {
    return {
      title: `Another £${amountGbp} earned`,
      message: "Your referral completed their first Teevo sale.",
      emailSubject: `You've earned £${amountGbp} Teevo credit`,
      emailBody: `Your referral completed their first Teevo sale.<br /><br />We've added £${amountGbp} Teevo credit to your account.<br /><br />Use it towards your next club on Teevo.`,
    };
  }
  return {
    title: `You've earned £${amountGbp} 🎉`,
    message: "Your referral completed their first purchase. Teevo credit has been added to your account.",
    emailSubject: `You've earned £${amountGbp} Teevo credit`,
    emailBody: `Someone you referred has completed their first Teevo purchase.<br /><br />We've added £${amountGbp} Teevo credit to your account.<br /><br />Use it towards your next club on Teevo.`,
  };
}

export async function notifyReferralRewardApproved(
  admin: SupabaseClient,
  opts: {
    referrerUserId: string;
    rewardId: string;
    rewardType: ReferralRewardTypeValue;
    amountPence: number;
  }
): Promise<void> {
  const amountGbp = formatGbp(opts.amountPence);
  const copy = copyForReward(opts.rewardType, amountGbp);
  const type =
    opts.rewardType === ReferralRewardType.SELLER_LISTING_CREDIT
      ? NotificationType.REFERRAL_SELLER_LISTING_REWARD
      : opts.rewardType === ReferralRewardType.SELLER_SALE_CREDIT
        ? NotificationType.REFERRAL_SELLER_SALE_REWARD
        : NotificationType.REFERRAL_BUYER_REWARD;

  await createNotification(admin, {
    userId: opts.referrerUserId,
    type,
    title: copy.title,
    message: copy.message,
    entityType: NotificationEntityType.ACCOUNT,
    entityId: opts.rewardId,
    actionUrl: "/dashboard/referrals",
    actionLabel: "View referrals",
    requiresAction: false,
  });

  const { data: user } = await admin
    .from("users")
    .select("email, first_name")
    .eq("id", opts.referrerUserId)
    .maybeSingle();
  if (!user?.email) return;

  await ensureEmailSent(admin, {
    emailType: EmailTriggerType.REFERRAL_CREDIT_EARNED,
    referenceId: opts.rewardId,
    recipientId: opts.referrerUserId,
    to: user.email,
    subject: copy.emailSubject,
    type: "transactional",
    variables: {
      title: copy.title,
      subtitle: "Your Teevo credit is ready to use.",
      body: copy.emailBody,
      item_name: "Teevo credit",
      order_number: opts.rewardId.slice(0, 8),
      hero_image: "",
      cta_link: `${appUrl}/dashboard/referrals`,
      cta_text: "View your credit",
    },
  });
}

export async function referralEmailModuleHtml(admin: SupabaseClient, userId: string): Promise<string> {
  const { data: user } = await admin.from("users").select("first_name").eq("id", userId).maybeSingle();
  const code = await ensureUserReferralCode(admin, { userId, firstName: user?.first_name });
  const url = code ? referralShareUrl(code.code) : `${appUrl}/dashboard/referrals`;
  return [
    `<p style="margin:24px 0 8px;font-weight:700;">Know another golfer who'd love Teevo?</p>`,
    `<p style="margin:0 0 12px;">Give them £5 towards their first purchase. You'll get £5 Teevo credit when they buy.</p>`,
    `<p style="margin:0;"><a href="${url}">Share your link</a></p>`,
  ].join("");
}
