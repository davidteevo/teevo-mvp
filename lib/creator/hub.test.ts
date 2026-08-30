import { describe, expect, it } from "vitest";
import {
  buildJourneySteps,
  isOneStepAway,
  primaryMissionRewardPence,
  progressStepKeys,
  remainingOpportunityPence,
} from "@/lib/creator/hub";
import { DEFAULT_REFERRAL_SETTINGS, type ReferralSettings } from "@/lib/referral/settings";

function settings(overrides: Partial<ReferralSettings> = {}): ReferralSettings {
  return { ...DEFAULT_REFERRAL_SETTINGS, ...overrides };
}

describe("remainingOpportunityPence", () => {
  it("sums listing + transaction at current rates when neither is done", () => {
    expect(
      remainingOpportunityPence({ listed: false, transacted: false }, settings())
    ).toBe(1500);
  });

  it("only counts transaction when already listed", () => {
    expect(
      remainingOpportunityPence({ listed: true, transacted: false }, settings())
    ).toBe(500);
  });

  it("returns 0 when fully complete", () => {
    expect(
      remainingOpportunityPence({ listed: true, transacted: true }, settings())
    ).toBe(0);
  });

  it("omits listing when listing reward is disabled", () => {
    expect(
      remainingOpportunityPence(
        { listed: false, transacted: false },
        settings({ creatorListingRewardEnabled: false })
      )
    ).toBe(500);
  });

  it("omits listing when listing pence is 0", () => {
    expect(
      remainingOpportunityPence(
        { listed: false, transacted: false },
        settings({ creatorListingRewardPence: 0 })
      )
    ).toBe(500);
  });

  it("treats cancelled reward row as unavailable", () => {
    expect(
      remainingOpportunityPence(
        { listed: false, transacted: false },
        settings(),
        { hasListingRewardRow: true, hasTransactionRewardRow: false }
      )
    ).toBe(500);
  });
});

describe("isOneStepAway", () => {
  it("is true when only transaction remains", () => {
    expect(isOneStepAway({ listed: true, transacted: false }, settings())).toBe(true);
  });

  it("is true when listing is disabled and only transaction remains", () => {
    expect(
      isOneStepAway(
        { listed: false, transacted: false },
        settings({ creatorListingRewardEnabled: false })
      )
    ).toBe(true);
  });

  it("is false when two milestones remain", () => {
    expect(isOneStepAway({ listed: false, transacted: false }, settings())).toBe(false);
  });
});

describe("primaryMissionRewardPence", () => {
  it("prefers listing reward", () => {
    expect(primaryMissionRewardPence(settings())).toBe(1000);
  });

  it("falls back to join when listing off", () => {
    expect(
      primaryMissionRewardPence(settings({ creatorListingRewardEnabled: false }))
    ).toBe(200);
  });
});

describe("buildJourneySteps / progressStepKeys", () => {
  it("omits disabled reward types from journey", () => {
    const steps = buildJourneySteps(
      settings({
        creatorNewUserRewardEnabled: false,
        creatorListingRewardEnabled: true,
        creatorTransactionRewardEnabled: true,
      }),
      true
    );
    expect(steps.map((s) => s.key)).toEqual(["list", "transact"]);
  });

  it("returns empty journey when not advertising", () => {
    expect(buildJourneySteps(settings(), false)).toEqual([]);
  });

  it("always includes join in progress rails; list/tx only when enabled", () => {
    expect(progressStepKeys(settings())).toEqual(["join", "list", "transact"]);
    expect(
      progressStepKeys(settings({ creatorListingRewardEnabled: false }))
    ).toEqual(["join", "transact"]);
  });
});
