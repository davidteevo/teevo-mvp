import { describe, expect, it } from "vitest";
import {
  BuyerFeeSettingsError,
  getBuyerFeeSettings,
  parseBuyerFeeFixedPence,
  parseBuyerFeePercentage,
  parsePoundsToPence,
  percentageToHundredths,
} from "@/lib/fees/settings";
import type { SupabaseClient } from "@supabase/supabase-js";

function mockAdmin(result: { data: { key: string; value: string }[] | null; error: { message: string } | null }) {
  return {
    from: () => ({
      select: () => ({
        in: async () => result,
      }),
    }),
  } as unknown as SupabaseClient;
}

describe("buyer fee validation", () => {
  it("accepts 0–100 with up to two decimal places", () => {
    expect(parseBuyerFeePercentage("0")).toBe(0);
    expect(parseBuyerFeePercentage("8")).toBe(8);
    expect(parseBuyerFeePercentage("8.00")).toBe(8);
    expect(parseBuyerFeePercentage("7.25")).toBe(7.25);
    expect(parseBuyerFeePercentage(100)).toBe(100);
    expect(percentageToHundredths(8)).toBe(800);
    expect(percentageToHundredths(7.25)).toBe(725);
  });

  it("rejects invalid percentages", () => {
    expect(() => parseBuyerFeePercentage("-1")).toThrow(BuyerFeeSettingsError);
    expect(() => parseBuyerFeePercentage("101")).toThrow(BuyerFeeSettingsError);
    expect(() => parseBuyerFeePercentage("8.001")).toThrow(BuyerFeeSettingsError);
    expect(() => parseBuyerFeePercentage("abc")).toThrow(BuyerFeeSettingsError);
  });

  it("rejects negative or extra-decimal fixed amounts", () => {
    expect(parseBuyerFeeFixedPence("50")).toBe(50);
    expect(parsePoundsToPence("0.50", "Fixed fee")).toBe(50);
    expect(() => parseBuyerFeeFixedPence("-1")).toThrow(BuyerFeeSettingsError);
    expect(() => parsePoundsToPence("-0.01", "Fixed fee")).toThrow(BuyerFeeSettingsError);
    expect(() => parsePoundsToPence("0.501", "Fixed fee")).toThrow(BuyerFeeSettingsError);
  });
});

describe("getBuyerFeeSettings fail-closed", () => {
  it("throws when keys are missing", async () => {
    await expect(getBuyerFeeSettings(mockAdmin({ data: [], error: null }))).rejects.toBeInstanceOf(
      BuyerFeeSettingsError
    );
  });

  it("throws on query error and does not fall back to 8%", async () => {
    await expect(
      getBuyerFeeSettings(mockAdmin({ data: null, error: { message: "db down" } }))
    ).rejects.toBeInstanceOf(BuyerFeeSettingsError);
  });

  it("throws on invalid stored values", async () => {
    await expect(
      getBuyerFeeSettings(
        mockAdmin({
          data: [
            { key: "buyer_fee_percentage", value: "not-a-number" },
            { key: "buyer_fee_fixed_pence", value: "50" },
          ],
          error: null,
        })
      )
    ).rejects.toBeInstanceOf(BuyerFeeSettingsError);
  });

  it("returns parsed config when both keys are valid", async () => {
    const settings = await getBuyerFeeSettings(
      mockAdmin({
        data: [
          { key: "buyer_fee_percentage", value: "8.00" },
          { key: "buyer_fee_fixed_pence", value: "50" },
        ],
        error: null,
      })
    );
    expect(settings).toEqual({ percentage: 8, percentageHundredths: 800, fixedPence: 50 });
  });
});
