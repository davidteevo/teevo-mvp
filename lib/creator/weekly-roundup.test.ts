import { describe, expect, it } from "vitest";
import { DEFAULT_REFERRAL_SETTINGS } from "@/lib/referral/settings";
import {
  buildCreatorWeeklyRoundupNoActivityEmail,
  creatorWeeklyShareMessage,
} from "@/lib/creator/weekly-roundup";

describe("buildCreatorWeeklyRoundupNoActivityEmail", () => {
  const shareUrl = "https://app.teevohq.com/r/DAVID";
  const hubUrl = "https://app.teevohq.com/dashboard/creator";

  it("leads with reward mission and points primary CTA at the share URL", () => {
    const content = buildCreatorWeeklyRoundupNoActivityEmail({
      settings: DEFAULT_REFERRAL_SETTINGS,
      shareUrl,
      hubUrl,
    });

    expect(content.subject).toBe("Earn £10 by getting a golfer listing on Teevo ⛳");
    expect(content.preheader).toContain("Who do you know with clubs sitting unused");
    expect(content.title).toBe("Your mission this week: earn £10 🚀");
    expect(content.cta_link).toBe(shareUrl);
    expect(content.cta_text).toBe("Share my Creator Link");
    expect(content.body).toContain(shareUrl);
    expect(content.body).toContain("View my Creator Hub");
    expect(content.body).toContain(hubUrl);
    expect(content.body).not.toContain("Share Teevo");
    expect(content.body).toContain("first approved listing");
    expect(content.body).toContain("1 successful referral = <strong>£10</strong>");
    expect(content.body).toContain("5 successful referrals = <strong>£50</strong>");
    expect(content.body).toContain("10 successful referrals = <strong>£100</strong>");
    expect(content.tip_block).toContain("Copy. Send. Earn.");
    expect(content.tip_block).toContain(creatorWeeklyShareMessage(shareUrl));
    expect(content.tip_block).not.toContain("Quick Tip");
  });

  it("falls back when listing reward is disabled", () => {
    const content = buildCreatorWeeklyRoundupNoActivityEmail({
      settings: {
        ...DEFAULT_REFERRAL_SETTINGS,
        creatorListingRewardEnabled: false,
      },
      shareUrl,
      hubUrl,
    });

    expect(content.subject).toContain("⛳");
    expect(content.body).toContain(DEFAULT_REFERRAL_SETTINGS.creatorMissionTitle);
    expect(content.cta_link).toBe(shareUrl);
  });
});
