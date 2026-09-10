import { describe, expect, it } from "vitest";
import { buildCreatorObjectiveCopy, creatorObjectivePreview } from "@/lib/creator/objective";
import {
  CreatorPrimaryObjective,
  DEFAULT_REFERRAL_SETTINGS,
  type ReferralSettings,
} from "@/lib/referral/settings";

function settings(overrides: Partial<ReferralSettings> = {}): ReferralSettings {
  return { ...DEFAULT_REFERRAL_SETTINGS, ...overrides };
}

describe("buildCreatorObjectiveCopy", () => {
  it("defaults to listings with £10 example = £100", () => {
    const copy = buildCreatorObjectiveCopy(settings());
    expect(copy.objective).toBe(CreatorPrimaryObjective.LISTINGS);
    expect(copy.rewardAmount).toBe("£10");
    expect(copy.focusHeadline).toBe("Earn £10 for every successful listing you generate");
    expect(copy.exampleReward).toBe("10 successful listings = £100");
    expect(copy.exampleRewardAmount).toBe("£100");
    expect(copy.focusCta).toBe("Start generating listings");
    expect(copy.incentiveTitle).toBe("£10 PER SUCCESSFUL LISTING");
    expect(copy.onboardingFirstAction).toContain("3 golfers");
    expect(copy.onboardingQuickStart).toContain("unused clubs");
  });

  it("builds new_users copy from new-user reward", () => {
    const copy = buildCreatorObjectiveCopy(
      settings({
        creatorPrimaryObjective: CreatorPrimaryObjective.NEW_USERS,
        creatorNewUserRewardPence: 200,
      })
    );
    expect(copy.rewardAmount).toBe("£2");
    expect(copy.focusHeadline).toBe("Earn £2 for every new golfer you bring to Teevo");
    expect(copy.exampleReward).toBe("10 new users = £20");
    expect(copy.exampleRewardAmount).toBe("£20");
    expect(copy.focusCta).toBe("Invite golfers to Teevo");
    expect(copy.onboardingFirstAction).toContain("who'd love Teevo");
  });

  it("builds transactions copy from transaction reward", () => {
    const copy = buildCreatorObjectiveCopy(
      settings({
        creatorPrimaryObjective: CreatorPrimaryObjective.TRANSACTIONS,
        creatorTransactionRewardPence: 500,
      })
    );
    expect(copy.rewardAmount).toBe("£5");
    expect(copy.focusHeadline).toBe("Earn £5 for every successful transaction you generate");
    expect(copy.exampleReward).toBe("10 qualifying transactions = £50");
    expect(copy.exampleRewardAmount).toBe("£50");
    expect(copy.focusCta).toBe("Start sharing Teevo");
    expect(copy.onboardingQuickStart).toContain("shopping for clubs");
  });

  it("formats non-integer pounds with two decimals in example", () => {
    const copy = buildCreatorObjectiveCopy(
      settings({
        creatorPrimaryObjective: CreatorPrimaryObjective.LISTINGS,
        creatorListingRewardPence: 350,
      })
    );
    expect(copy.rewardAmount).toBe("£3.50");
    expect(copy.exampleReward).toBe("10 successful listings = £35");
  });

  it("falls back when primary reward is disabled", () => {
    const copy = buildCreatorObjectiveCopy(
      settings({
        creatorPrimaryObjective: CreatorPrimaryObjective.LISTINGS,
        creatorListingRewardEnabled: false,
      })
    );
    expect(copy.enabled).toBe(false);
    expect(copy.focusHeadline).toBe("Help get more great equipment onto Teevo");
    expect(copy.incentiveTitle).toBe("HELP BUILD THE TEEVO MARKETPLACE");
  });
});

describe("creatorObjectivePreview", () => {
  it("exposes admin preview fields", () => {
    const preview = creatorObjectivePreview(
      settings({ creatorPrimaryObjective: CreatorPrimaryObjective.LISTINGS })
    );
    expect(preview.rewardLine).toContain("£10");
    expect(preview.headline).toContain("successful listing");
    expect(preview.cta).toBe("Start generating listings");
  });
});
