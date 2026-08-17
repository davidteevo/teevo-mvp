import { describe, expect, it } from "vitest";
import { isExternalActionUrl } from "@/lib/notification-action";

describe("isExternalActionUrl", () => {
  it("treats courier tracking URLs as external", () => {
    expect(isExternalActionUrl("https://track.dpd.co.uk/123")).toBe(true);
    expect(isExternalActionUrl("http://example.com/track")).toBe(true);
  });

  it("treats in-app paths as internal", () => {
    expect(isExternalActionUrl("/dashboard/purchases?id=abc")).toBe(false);
    expect(isExternalActionUrl("/notifications")).toBe(false);
  });
});
