/**
 * Shared Creator Programme objective copy — used by onboarding emails
 * (and available later for Creator Hub).
 */

import { formatPoundsCompact } from "@/lib/pricing";
import {
  CreatorPrimaryObjective,
  type CreatorPrimaryObjectiveValue,
  type ReferralSettings,
} from "@/lib/referral/settings";

export type CreatorObjectiveReward = {
  objective: CreatorPrimaryObjectiveValue;
  enabled: boolean;
  rewardPence: number;
  rewardAmount: string;
  rewardAction: string;
  rewardActionPlural: string;
  focus: string;
  focusLabel: string;
};

export type CreatorObjectiveCopy = CreatorObjectiveReward & {
  focusHeadline: string;
  focusDescription: string;
  focusCta: string;
  qualificationText: string;
  exampleReward: string;
  /** GBP total for 10× reward (hero composition). */
  exampleRewardAmount: string;
  suggestedActions: string[];
  conditionalIntro: string;
  conditionalBullets: string[];
  incentiveEyebrow: string;
  incentiveTitle: string;
  /** Short “what to do” for Email A — no reward amounts. */
  onboardingWhatToDo: string;
  onboardingFirstAction: string;
  onboardingSecondaryShare: string;
  onboardingQuickStart: string;
};

const EXAMPLE_MULTIPLIER = 10;

function rewardForObjective(settings: ReferralSettings): CreatorObjectiveReward {
  const objective = settings.creatorPrimaryObjective;

  if (objective === CreatorPrimaryObjective.NEW_USERS) {
    return {
      objective,
      enabled: settings.creatorNewUserRewardEnabled && settings.creatorNewUserRewardPence > 0,
      rewardPence: settings.creatorNewUserRewardPence,
      rewardAmount: formatPoundsCompact(settings.creatorNewUserRewardPence),
      rewardAction: "new user",
      rewardActionPlural: "new users",
      focus: "new users",
      focusLabel: "New users",
    };
  }

  if (objective === CreatorPrimaryObjective.TRANSACTIONS) {
    return {
      objective,
      enabled:
        settings.creatorTransactionRewardEnabled && settings.creatorTransactionRewardPence > 0,
      rewardPence: settings.creatorTransactionRewardPence,
      rewardAmount: formatPoundsCompact(settings.creatorTransactionRewardPence),
      rewardAction: "successful transaction",
      rewardActionPlural: "successful transactions",
      focus: "transactions",
      focusLabel: "Transactions",
    };
  }

  return {
    objective: CreatorPrimaryObjective.LISTINGS,
    enabled: settings.creatorListingRewardEnabled && settings.creatorListingRewardPence > 0,
    rewardPence: settings.creatorListingRewardPence,
    rewardAmount: formatPoundsCompact(settings.creatorListingRewardPence),
    rewardAction: "successful listing",
    rewardActionPlural: "successful listings",
    focus: "listings",
    focusLabel: "Listings",
  };
}

function exampleRewardAmount(reward: CreatorObjectiveReward): string {
  return formatPoundsCompact(reward.rewardPence * EXAMPLE_MULTIPLIER);
}

function exampleRewardLine(reward: CreatorObjectiveReward): string {
  const total = exampleRewardAmount(reward);
  if (reward.objective === CreatorPrimaryObjective.NEW_USERS) {
    return `${EXAMPLE_MULTIPLIER} new users = ${total}`;
  }
  if (reward.objective === CreatorPrimaryObjective.TRANSACTIONS) {
    return `${EXAMPLE_MULTIPLIER} qualifying transactions = ${total}`;
  }
  return `${EXAMPLE_MULTIPLIER} successful listings = ${total}`;
}

export function buildCreatorObjectiveCopy(settings: ReferralSettings): CreatorObjectiveCopy {
  const reward = rewardForObjective(settings);
  const amount = reward.rewardAmount;
  const exampleAmount = exampleRewardAmount(reward);

  if (reward.objective === CreatorPrimaryObjective.NEW_USERS) {
    return {
      ...reward,
      focusHeadline: reward.enabled
        ? `Earn ${amount} for every new golfer you bring to Teevo`
        : "Bring more golfers to Teevo",
      focusDescription:
        "Help grow the Teevo community by introducing more golfers to the marketplace.",
      focusCta: "Invite golfers to Teevo",
      qualificationText:
        "A creator reward becomes eligible when the referral satisfies the configured new-user reward criteria.",
      exampleReward: reward.enabled
        ? exampleRewardLine(reward)
        : "Share your creator link to grow the Teevo community.",
      exampleRewardAmount: exampleAmount,
      suggestedActions: [
        "Share Teevo on Instagram",
        "Add Teevo to Stories",
        "Send the creator link to golfing friends",
        "Share in relevant golf communities",
        "Mention Teevo in golf content",
      ],
      conditionalIntro:
        "Know golfers who would benefit from a better way to buy and sell golf equipment?\n\nIntroduce them to Teevo.",
      conditionalBullets: [
        "Share Teevo on Instagram Stories",
        "Send your link to golfing friends",
        "Share it in golf WhatsApp groups",
        "Mention Teevo in your content",
        "Introduce your audience to Teevo",
      ],
      incentiveEyebrow: "GET REWARDED",
      incentiveTitle: reward.enabled
        ? `${amount} per new user`
        : "Help grow the Teevo community",
      onboardingWhatToDo:
        "Right now Teevo's priority is bringing more golfers onto the marketplace.\n\nYou have a unique creator referral link. When someone joins Teevo through your link, you earn a reward.",
      onboardingFirstAction:
        "Your first challenge: send your creator link to 3 golfers who'd love Teevo.",
      onboardingSecondaryShare:
        "Instagram Stories, WhatsApp groups, golf clubs and your creator content are all good places to share it.",
      onboardingQuickStart: "Know 3 golfers not on Teevo yet? Send them your link today.",
    };
  }

  if (reward.objective === CreatorPrimaryObjective.TRANSACTIONS) {
    return {
      ...reward,
      focusHeadline: reward.enabled
        ? `Earn ${amount} for every successful transaction you generate`
        : "Help golfers complete transactions on Teevo",
      focusDescription: "Help golfers discover and buy great golf equipment through Teevo.",
      focusCta: "Start sharing Teevo",
      qualificationText:
        "A creator reward becomes eligible when the configured qualifying transaction is successfully completed.",
      exampleReward: reward.enabled
        ? exampleRewardLine(reward)
        : "Share Teevo with golfers ready to buy or sell.",
      exampleRewardAmount: exampleAmount,
      suggestedActions: [
        "Share Teevo listings",
        "Share products with golfers looking for equipment",
        "Feature Teevo in golf content",
        "Send Teevo to golfers considering new equipment",
        "Share relevant products with their audience",
      ],
      conditionalIntro:
        "Know someone looking for their next driver, putter, wedges or set of irons?\n\nHelp them discover Teevo.",
      conditionalBullets: [
        "Share Teevo listings",
        "Send products to friends looking for equipment",
        "Feature Teevo in your content",
        "Share your creator link with your audience",
        "Recommend Teevo when golfers are discussing equipment purchases",
      ],
      incentiveEyebrow: "GET REWARDED",
      incentiveTitle: reward.enabled
        ? `${amount} per successful transaction`
        : "Drive transactions on Teevo",
      onboardingWhatToDo:
        "Right now Teevo's priority is helping more golfers buy and sell great equipment.\n\nYou have a unique creator referral link. When someone joins through your link and completes a qualifying transaction, you earn a reward.",
      onboardingFirstAction:
        "Your first challenge: send your creator link to 3 golfers ready to buy or upgrade.",
      onboardingSecondaryShare:
        "Instagram Stories, WhatsApp groups, golf clubs and your creator content are all good places to share it.",
      onboardingQuickStart: "Know 3 golfers shopping for clubs? Send them your link today.",
    };
  }

  return {
    ...reward,
    focusHeadline: reward.enabled
      ? `Earn ${amount} for every successful listing you generate`
      : "Help get more great equipment onto Teevo",
    focusDescription:
      "Our biggest priority right now is getting more great golf equipment onto Teevo.",
    focusCta: "Start generating listings",
    qualificationText:
      "A creator reward becomes eligible when a referred user completes a qualifying successful listing according to the existing Creator Programme rules.",
    exampleReward: reward.enabled
      ? exampleRewardLine(reward)
      : "Share your creator link with golfers who have equipment to sell.",
    exampleRewardAmount: exampleAmount,
    suggestedActions: [
      "Share on Instagram Stories",
      "Send to golf WhatsApp groups",
      "Send directly to golfing friends",
      "Share with golfers currently selling equipment elsewhere",
      "Mention Teevo in relevant golf content",
    ],
    conditionalIntro:
      "Know someone with an old driver sitting in the garage? A previous set of irons? A putter they've replaced?\n\nThat's exactly who we want.",
    conditionalBullets: [
      "Share your Teevo link on Instagram Stories",
      "Send it into your golf WhatsApp groups",
      "Send it directly to friends with equipment to sell",
      "Mention Teevo in your golf content",
      "Share it with golfers currently trying to sell clubs elsewhere",
    ],
    incentiveEyebrow: "GET REWARDED",
    incentiveTitle: reward.enabled
      ? `${amount} per successful listing`
      : "Help build the Teevo marketplace",
    onboardingWhatToDo:
      "Right now Teevo's priority is getting more great golf equipment listed.\n\nYou have a unique creator referral link. When someone joins Teevo through your link and completes a qualifying successful listing, you earn a reward.",
    onboardingFirstAction:
      "Your first challenge: send your creator link to 3 golfers you know with equipment they could sell.",
    onboardingSecondaryShare:
      "Instagram Stories, WhatsApp groups, golf clubs and your creator content are all good places to share it.",
    onboardingQuickStart: "Know 3 golfers with unused clubs? Send them your link today.",
  };
}

/** Compact preview strings for Admin settings UI. */
export function creatorObjectivePreview(settings: ReferralSettings): {
  objective: CreatorPrimaryObjectiveValue;
  rewardLine: string;
  headline: string;
  description: string;
  cta: string;
  exampleReward: string;
} {
  const copy = buildCreatorObjectiveCopy(settings);
  const rewardLine = copy.enabled
    ? `Current reward: ${copy.rewardAmount} per ${copy.rewardAction}`
    : `Current reward for ${copy.focusLabel.toLowerCase()} is off or £0 — edit amounts below`;
  return {
    objective: copy.objective,
    rewardLine,
    headline: copy.focusHeadline,
    description: copy.focusDescription,
    cta: copy.focusCta,
    exampleReward: copy.exampleReward,
  };
}
