import { describe, expect, it } from "vitest";
import {
  DEFAULT_CREATOR_BRAND_PACK_URL,
  DEFAULT_REFERRAL_SETTINGS,
  isCreatorBrandPackAvailable,
  type ReferralSettings,
} from "@/lib/referral/settings";

function settings(overrides: Partial<ReferralSettings> = {}): ReferralSettings {
  return { ...DEFAULT_REFERRAL_SETTINGS, ...overrides };
}

describe("isCreatorBrandPackAvailable", () => {
  it("is available with default seeded Drive URL", () => {
    expect(isCreatorBrandPackAvailable(settings())).toBe(true);
    expect(DEFAULT_CREATOR_BRAND_PACK_URL).toContain("1Z08g03AmCv24bVuvzojjDiIeyEC-buZy");
  });

  it("is unavailable when disabled", () => {
    expect(
      isCreatorBrandPackAvailable(settings({ creatorBrandPackEnabled: false }))
    ).toBe(false);
  });

  it("is unavailable when URL is empty", () => {
    expect(isCreatorBrandPackAvailable(settings({ creatorBrandPackUrl: "" }))).toBe(false);
    expect(isCreatorBrandPackAvailable(settings({ creatorBrandPackUrl: "   " }))).toBe(false);
  });

  it("is unavailable for non-https URLs", () => {
    expect(
      isCreatorBrandPackAvailable(
        settings({ creatorBrandPackUrl: "http://drive.google.com/folder" })
      )
    ).toBe(false);
    expect(
      isCreatorBrandPackAvailable(settings({ creatorBrandPackUrl: "javascript:alert(1)" }))
    ).toBe(false);
  });
});
