import { describe, expect, it } from "vitest";
import { parseBuyerFeeSnapshotFromMetadata } from "@/lib/fees/snapshot";

describe("parseBuyerFeeSnapshotFromMetadata", () => {
  it("returns the session snapshot and does not invent current settings", () => {
    expect(
      parseBuyerFeeSnapshotFromMetadata({
        buyerFeePercentage: "7.00",
        buyerFeeFixedPence: "50",
        buyerFeeAmountPence: "750",
      })
    ).toEqual({ percentage: 7, fixedPence: 50, amountPence: 750 });
  });

  it("returns null for legacy sessions with no fee metadata", () => {
    expect(parseBuyerFeeSnapshotFromMetadata({ listingId: "abc" })).toBeNull();
    expect(parseBuyerFeeSnapshotFromMetadata(null)).toBeNull();
  });

  it("throws on partial metadata instead of reconstructing a fee", () => {
    expect(() =>
      parseBuyerFeeSnapshotFromMetadata({
        buyerFeePercentage: "8.00",
        buyerFeeFixedPence: "50",
      })
    ).toThrow(/Incomplete/);
  });
});
