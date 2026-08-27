import type { SupabaseClient } from "@supabase/supabase-js";
import { EmailTriggerType, ensureEmailSent, formatGbp } from "@/lib/email-triggers";
import { getAppUrl } from "@/lib/app-env";
import {
  createNotification,
  NotificationEntityType,
  NotificationType,
} from "@/lib/notifications";
import { ensureUserReferralCode, referralShareUrl } from "@/lib/referral/codes";
import { isCreatorMilestoneRewardType, ReferralPriority, ReferralRewardType, type ReferralRewardTypeValue } from "@/lib/referral/types";
import { getReferralSettings } from "@/lib/referral/settings";

const appUrl = getAppUrl();

function copyForReward(rewardType: ReferralRewardTypeValue, amountGbp: string): {
  title: string;
  message: string;
  emailSubject: string;
  emailBody: string;
} {
  if (rewardType === ReferralRewardType.SELLER_LISTING_CREDIT) {
    return {
      title: `\u00A3${amountGbp} Teevo credit earned`,
      message: "Someone you referred has listed their first club.",
      emailSubject: `\uD83D\uDCB8 \u00A3${amountGbp} Teevo credit earned!`,
      emailBody: `Someone you referred has listed their first club on Teevo.\n\nWe\u2019ve added \u00A3${amountGbp} Teevo credit to your account. Use it towards your next club.`,
    };
  }
  if (rewardType === ReferralRewardType.REFERRED_SELLER_LISTING_CREDIT) {
    return {
      title: `\u00A3${amountGbp} Teevo credit earned`,
      message: "Your first listing was approved. Teevo credit has been added to your account.",
      emailSubject: `\uD83D\uDCB8 \u00A3${amountGbp} Teevo credit earned!`,
      emailBody: `Your first Teevo listing was approved.\n\nWe\u2019ve added \u00A3${amountGbp} Teevo credit to your account. Use it towards your next club.`,
    };
  }
  if (rewardType === ReferralRewardType.SELLER_SALE_CREDIT) {
    return {
      title: `Another \u00A3${amountGbp} Teevo credit earned`,
      message: "Your referral completed their first Teevo sale.",
      emailSubject: `\uD83C\uDF89 Another \u00A3${amountGbp} Teevo credit earned!`,
      emailBody: `Your referral completed their first sale on Teevo.\n\nWe\u2019ve added another \u00A3${amountGbp} Teevo credit to your account. Use it towards your next club.`,
    };
  }
  if (rewardType === ReferralRewardType.CREATOR_NEW_USER_REWARD) {
    return {
      title: `\u00A3${amountGbp} Teevo credit earned`,
      message: "Someone signed up with your creator link.",
      emailSubject: `\uD83D\uDCB8 \u00A3${amountGbp} creator credit earned!`,
      emailBody: `Someone signed up on Teevo using your creator link.\n\nWe\u2019ve added \u00A3${amountGbp} Teevo credit to your account.`,
    };
  }
  if (rewardType === ReferralRewardType.CREATOR_LISTING_REWARD) {
    return {
      title: `\u00A3${amountGbp} Teevo credit earned`,
      message: "A user you referred had their first listing approved.",
      emailSubject: `\uD83D\uDCB8 \u00A3${amountGbp} creator credit earned!`,
      emailBody: `A user you referred had their first Teevo listing approved.\n\nWe\u2019ve added \u00A3${amountGbp} Teevo credit to your account.`,
    };
  }
  if (rewardType === ReferralRewardType.CREATOR_TRANSACTION_REWARD) {
    return {
      title: `\u00A3${amountGbp} Teevo credit earned`,
      message: "A user you referred completed their first marketplace transaction.",
      emailSubject: `\uD83D\uDCB8 \u00A3${amountGbp} creator credit earned!`,
      emailBody: `A user you referred completed their first Teevo transaction.\n\nWe\u2019ve added \u00A3${amountGbp} Teevo credit to your account.`,
    };
  }
  return {
    title: `You\u2019ve earned \u00A3${amountGbp} Teevo credit \uD83C\uDF89`,
    message: "Your referral completed their first purchase. Teevo credit has been added to your account.",
    emailSubject: `\uD83C\uDF89 You\u2019ve earned \u00A3${amountGbp} Teevo credit!`,
    emailBody: `Someone you referred has completed their first Teevo purchase.\n\nWe\u2019ve added \u00A3${amountGbp} Teevo credit to your account. Use it towards your next club on Teevo.`,
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
  const isCreatorReward = isCreatorMilestoneRewardType(opts.rewardType);
  const type =
    opts.rewardType === ReferralRewardType.SELLER_LISTING_CREDIT
      ? NotificationType.REFERRAL_SELLER_LISTING_REWARD
      : opts.rewardType === ReferralRewardType.REFERRED_SELLER_LISTING_CREDIT
        ? NotificationType.REFERRAL_REFERRED_LISTING_REWARD
        : opts.rewardType === ReferralRewardType.SELLER_SALE_CREDIT
          ? NotificationType.REFERRAL_SELLER_SALE_REWARD
          : NotificationType.REFERRAL_BUYER_REWARD;

  const actionUrl = isCreatorReward ? "/dashboard/creator" : "/dashboard/referrals";
  const actionLabel = isCreatorReward ? "Open Creator Hub" : "View referrals";

  await createNotification(admin, {
    userId: opts.referrerUserId,
    type,
    title: copy.title,
    message: copy.message,
    entityType: NotificationEntityType.ACCOUNT,
    entityId: opts.rewardId,
    actionUrl,
    actionLabel,
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
      cta_link: `${appUrl}${actionUrl}`,
      cta_text: isCreatorReward ? "Open Creator Hub" : "View your credit",
    },
  });
}

export async function referralEmailModuleHtml(admin: SupabaseClient, userId: string): Promise<string> {
  const settings = await getReferralSettings(admin);
  const { data: user } = await admin.from("users").select("first_name").eq("id", userId).maybeSingle();
  const code = await ensureUserReferralCode(admin, { userId, firstName: user?.first_name });
  const url = code ? referralShareUrl(code.code) : `${appUrl}/dashboard/referrals`;
  const listingReward = formatGbp(settings.sellerListingRewardPence);
  const discount = formatGbp(settings.discountPence);
  const referrerReward = formatGbp(settings.referrerRewardPence);
  if (settings.referralPriority === ReferralPriority.SUPPLY) {
    return [
      `<p style="margin:24px 0 8px;font-weight:700;">Know another golfer who'd love Teevo?</p>`,
      `<p style="margin:0 0 12px;">Invite a friend — you'll both get £${listingReward} Teevo credit when their first listing is approved.</p>`,
      `<p style="margin:0;"><a href="${url}">Share your link</a></p>`,
    ].join("");
  }
  return [
    `<p style="margin:24px 0 8px;font-weight:700;">Know another golfer who'd love Teevo?</p>`,
    `<p style="margin:0 0 12px;">Give them £${discount} towards their first purchase. You'll get £${referrerReward} Teevo credit when they buy.</p>`,
    `<p style="margin:0;"><a href="${url}">Share your link</a></p>`,
  ].join("");
}
