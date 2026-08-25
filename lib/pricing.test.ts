import { describe, expect, it } from "vitest";
import { calcAuthenticityFeePence, calcOrderBreakdown, type BuyerFeeConfig } from "@/lib/pricing";

const eightPlusFifty: BuyerFeeConfig = {
  percentage: 8,
  percentageHundredths: 800,
  fixedPence: 50,
};

describe("calcAuthenticityFeePence", () => {
  it("uses integer hundredths: 8% + 50p on £100", () => {
    expect(calcAuthenticityFeePence(10000, eightPlusFifty)).toBe(850);
  });

  it("supports 0%", () => {
    expect(calcAuthenticityFeePence(10000, { percentage: 0, percentageHundredths: 0, fixedPence: 50 })).toBe(50);
  });

  it("supports 100%", () => {
    expect(
      calcAuthenticityFeePence(10000, { percentage: 100, percentageHundredths: 10000, fixedPence: 0 })
    ).toBe(10000);
  });

  it("supports two-decimal percentages", () => {
    expect(
      calcAuthenticityFeePence(10000, { percentage: 7.25, percentageHundredths: 725, fixedPence: 50 })
    ).toBe(775);
  });

  it("rounds the percentage portion to the nearest penny", () => {
    expect(calcAuthenticityFeePence(333, eightPlusFifty)).toBe(77);
  });
});

describe("calcOrderBreakdown", () => {
  it("adds fee and shipping on top of item price", () => {
    const b = calcOrderBreakdown(10000, eightPlusFifty);
    expect(b.itemPence).toBe(10000);
    expect(b.authenticityPence).toBe(850);
    expect(b.shippingPence).toBe(949);
    expect(b.totalPence).toBe(11799);
  });
});
