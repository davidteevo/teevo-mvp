import { describe, expect, it } from "vitest";
import {
  founderMilestoneMessage,
  founderProgressLabel,
  founderRemainingLabel,
  founderSocialProof,
} from "@/lib/founder/copy";
import { isExcludedFromFounderAllocation } from "@/lib/founder/eligibility";
import {
  FOUNDER_CAMPAIGN_LIMIT,
  parseFounderCampaignStatus,
  parseFounderLimit,
} from "@/lib/founder/types";
import { isFounderCampaignActive, type FounderCampaignSnapshot } from "@/lib/founder/campaign";

describe("founder copy", () => {
  it("formats progress and remaining from real counts", () => {
    expect(founderProgressLabel(47, 100)).toBe("47 / 100 Founder spots claimed");
    expect(founderRemainingLabel(47, 100)).toBe("53 Founder spots remaining");
    expect(founderRemainingLabel(99, 100)).toBe("1 Founder spot remaining");
  });

  it("uses milestone thresholds without fake urgency", () => {
    expect(founderMilestoneMessage(10, 100)).toBe("Join Teevo's first 100.");
    expect(founderMilestoneMessage(50, 100)).toBe("We're halfway there.");
    expect(founderMilestoneMessage(80, 100)).toBe("Founder spots are filling up.");
    expect(founderMilestoneMessage(93, 100)).toBe("Only 7 Founder spots left.");
    expect(founderMilestoneMessage(100, 100)).toContain("first 100 are in");
  });

  it("only shows social proof from real claimed counts", () => {
    expect(founderSocialProof(0)).toBeNull();
    expect(founderSocialProof(1)).toBe("Join 1 golfer already building Teevo.");
    expect(founderSocialProof(63)).toBe("Join 63 golfers already building Teevo.");
  });
});

describe("founder eligibility", () => {
  it("excludes admin and admin-created sellers", () => {
    expect(isExcludedFromFounderAllocation({ role: "admin" })).toBe(true);
    expect(isExcludedFromFounderAllocation({ role: "seller", created_by_admin: true })).toBe(true);
    expect(isExcludedFromFounderAllocation({ role: "seller", created_by_admin: false })).toBe(false);
  });
});

describe("founder campaign status helpers", () => {
  it("parses status and caps limit at 100", () => {
    expect(parseFounderCampaignStatus("paused")).toBe("paused");
    expect(parseFounderCampaignStatus("nope")).toBe("active");
    expect(parseFounderLimit("250")).toBe(FOUNDER_CAMPAIGN_LIMIT);
    expect(parseFounderLimit("50")).toBe(50);
  });

  it("treats campaign active only when status active and spots remain", () => {
    const active: FounderCampaignSnapshot = {
      status: "active",
      claimed: 3,
      remaining: 97,
      limit: 100,
      activated: 1,
    };
    const full: FounderCampaignSnapshot = {
      status: "complete",
      claimed: 100,
      remaining: 0,
      limit: 100,
      activated: 40,
    };
    expect(isFounderCampaignActive(active)).toBe(true);
    expect(isFounderCampaignActive(full)).toBe(false);
    expect(isFounderCampaignActive({ ...active, status: "paused" })).toBe(false);
  });
});
