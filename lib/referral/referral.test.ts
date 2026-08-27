import { describe, expect, it } from "vitest";
import {
  baseCodeFromFirstName,
  isReservedReferralCode,
  isValidReferralCodeFormat,
  nextCodeCandidate,
  normalizeReferralCode,
} from "@/lib/referral/codes";
import {
  computeCheckoutIncentives,
  sellerProceedsPence,
} from "@/lib/referral/checkout-incentives";
import { attributionSource, decideAttribution, decideCreatorMilestone, decideNewCustomerDiscount, isDemandReferral, isSupplyReferral } from "@/lib/referral/eligibility";
import { creditBalanceFromRows } from "@/lib/referral/credit";
import { buyerShareMessage, sellerShareMessage } from "@/lib/referral/share-copy";
import { calcOrderBreakdown, type BuyerFeeConfig } from "@/lib/pricing";
import { isCreatorMilestoneRewardType, ReferralRewardType } from "@/lib/referral/types";
import { DEFAULT_REFERRAL_SETTINGS } from "@/lib/referral/settings";
import { isValidEmail } from "@/lib/admin/resolve-or-create-user";

const defaultFees: BuyerFeeConfig = {
  percentage: 8,
  percentageHundredths: 800,
  fixedPence: 50,
};

describe("referral codes", () => {
  it("normalizes case and strips non-alphanumerics", () => {
    expect(normalizeReferralCode(" david-5 ")).toBe("DAVID5");
  });

  it("blocks reserved and Teevo/Admin impersonation", () => {
    expect(isReservedReferralCode("TEEVO")).toBe(true);
    expect(isReservedReferralCode("teevohq")).toBe(true);
    expect(isReservedReferralCode("ADMIN1")).toBe(true);
    expect(isReservedReferralCode("DAVID")).toBe(false);
    expect(isValidReferralCodeFormat("AB")).toBe(false);
    expect(isValidReferralCodeFormat("GOLFGUY")).toBe(true);
  });

  it("builds readable candidates from a first name", () => {
    expect(baseCodeFromFirstName("David")).toBe("DAVID");
    expect(nextCodeCandidate("DAVID", 0)).toBe("DAVID");
    expect(nextCodeCandidate("DAVID", 1)).toBe("DAVID2");
  });
});

describe("attribution rules", () => {
  it("accepts a first valid user code", () => {
    const decision = decideAttribution({
      alreadyAttributed: false,
      actorUserId: "new-user",
      codeOwnerUserId: "referrer",
      codeStatus: "active",
      codeKind: "user",
      creatorStatus: null,
      programmeEnabled: true,
      creatorProgrammeEnabled: true,
    });
    expect(decision).toEqual({ accept: true, reason: "ok" });
  });

  it("first valid attribution wins", () => {
    const decision = decideAttribution({
      alreadyAttributed: true,
      actorUserId: "new-user",
      codeOwnerUserId: "other",
      codeStatus: "active",
      codeKind: "user",
      creatorStatus: null,
      programmeEnabled: true,
      creatorProgrammeEnabled: true,
    });
    expect(decision.accept).toBe(false);
    expect(decision.reason).toBe("already_attributed");
  });

  it("blocks self-referral", () => {
    const decision = decideAttribution({
      alreadyAttributed: false,
      actorUserId: "same",
      codeOwnerUserId: "same",
      codeStatus: "active",
      codeKind: "user",
      creatorStatus: null,
      programmeEnabled: true,
      creatorProgrammeEnabled: true,
    });
    expect(decision.reason).toBe("self_referral");
  });

  it("rejects disabled codes and inactive creators", () => {
    expect(
      decideAttribution({
        alreadyAttributed: false,
        actorUserId: "new-user",
        codeOwnerUserId: "referrer",
        codeStatus: "disabled",
        codeKind: "user",
        creatorStatus: null,
        programmeEnabled: true,
        creatorProgrammeEnabled: true,
      }).reason
    ).toBe("code_disabled");
    expect(
      decideAttribution({
        alreadyAttributed: false,
        actorUserId: "new-user",
        codeOwnerUserId: "creator-user",
        codeStatus: "active",
        codeKind: "creator",
        creatorStatus: "paused",
        programmeEnabled: true,
        creatorProgrammeEnabled: true,
      }).reason
    ).toBe("creator_inactive");
  });

  it("maps creator vs user sources", () => {
    expect(attributionSource({ kind: "user", via: "url" })).toBe("url");
    expect(attributionSource({ kind: "creator", via: "code" })).toBe("creator_code");
  });

  it("allows user attribution when seller referral is on even if demand programme is off", () => {
    const decision = decideAttribution({
      alreadyAttributed: false,
      actorUserId: "new-user",
      codeOwnerUserId: "referrer",
      codeStatus: "active",
      codeKind: "user",
      creatorStatus: null,
      programmeEnabled: false,
      sellerEnabled: true,
      creatorProgrammeEnabled: true,
    });
    expect(decision).toEqual({ accept: true, reason: "ok" });
  });

  it("rejects user attribution when both programme and seller referral are off", () => {
    const decision = decideAttribution({
      alreadyAttributed: false,
      actorUserId: "new-user",
      codeOwnerUserId: "referrer",
      codeStatus: "active",
      codeKind: "user",
      creatorStatus: null,
      programmeEnabled: false,
      sellerEnabled: false,
      creatorProgrammeEnabled: true,
    });
    expect(decision.reason).toBe("programme_disabled");
  });
});

describe("reward priority helpers", () => {
  it("honours snapshotted supply/demand priority over current settings", () => {
    expect(isSupplyReferral({ reward_priority: "supply" }, { sellerEnabled: false })).toBe(true);
    expect(isDemandReferral({ reward_priority: "supply" }, { programmeEnabled: true })).toBe(false);
    expect(isDemandReferral({ reward_priority: "demand" }, { programmeEnabled: false })).toBe(true);
    expect(isSupplyReferral({ reward_priority: "demand" }, { sellerEnabled: true })).toBe(false);
  });

  it("falls back to legacy toggles when priority is null", () => {
    expect(isSupplyReferral({ reward_priority: null }, { sellerEnabled: true })).toBe(true);
    expect(isSupplyReferral({ reward_priority: null }, { sellerEnabled: false })).toBe(false);
    expect(isDemandReferral({ reward_priority: null }, { programmeEnabled: true })).toBe(true);
    expect(isDemandReferral({ reward_priority: null }, { programmeEnabled: false })).toBe(false);
  });
});

describe("share copy amounts", () => {
  it("interpolates admin amounts instead of hardcoding £5", () => {
    expect(buyerShareMessage("https://example.com/r/DAVID", 700)).toContain("£7");
    expect(buyerShareMessage("https://example.com/r/DAVID", 700)).not.toContain("£5");
    expect(sellerShareMessage("https://example.com/r/DAVID", 1000)).toContain("£10");
  });
});

describe("new customer discount eligibility", () => {
  it("applies when referred, new, and above the minimum", () => {
    expect(
      decideNewCustomerDiscount({
        programmeEnabled: true,
        hasReferral: true,
        isSelfReferral: false,
        priorNonRefundedBuyerPurchases: 0,
        itemPence: 15000,
        minItemPence: 5000,
      })
    ).toEqual({ eligible: true, reason: "ok" });
  });

  it("blocks existing customers, self-referral, and sub-minimum carts", () => {
    expect(
      decideNewCustomerDiscount({
        programmeEnabled: true,
        hasReferral: true,
        isSelfReferral: false,
        priorNonRefundedBuyerPurchases: 1,
        itemPence: 15000,
        minItemPence: 5000,
      }).reason
    ).toBe("existing_customer");
    expect(
      decideNewCustomerDiscount({
        programmeEnabled: true,
        hasReferral: true,
        isSelfReferral: true,
        priorNonRefundedBuyerPurchases: 0,
        itemPence: 15000,
        minItemPence: 5000,
      }).reason
    ).toBe("self_referral");
    expect(
      decideNewCustomerDiscount({
        programmeEnabled: true,
        hasReferral: true,
        isSelfReferral: false,
        priorNonRefundedBuyerPurchases: 0,
        itemPence: 4000,
        minItemPence: 5000,
      }).reason
    ).toBe("below_minimum");
  });
});

describe("checkout incentives protect seller proceeds", () => {
  it("keeps item pence unchanged and reduces application fee by the discount", () => {
    const { itemPence, authenticityPence, shippingPence } = calcOrderBreakdown(15000, defaultFees);
    const result = computeCheckoutIncentives({
      itemPence,
      authenticityPence,
      shippingPence,
      referralDiscountPence: 500,
      availableCreditPence: 0,
      applyCredit: false,
    });
    expect(result.itemPence).toBe(15000);
    expect(result.referralDiscountAppliedPence).toBe(500);
    expect(result.applicationFeePence).toBe(authenticityPence + shippingPence - 500);
    expect(sellerProceedsPence(result)).toBe(15000);
    expect(result.buyerTotalPence).toBe(itemPence + authenticityPence + shippingPence - 500);
  });

  it("applies referral discount first then caps credit to remaining platform take", () => {
    const { itemPence, authenticityPence, shippingPence } = calcOrderBreakdown(5000, defaultFees);
    const platform = authenticityPence + shippingPence;
    const result = computeCheckoutIncentives({
      itemPence,
      authenticityPence,
      shippingPence,
      referralDiscountPence: 500,
      availableCreditPence: 100000,
      applyCredit: true,
    });
    expect(result.referralDiscountAppliedPence).toBe(500);
    expect(result.creditRedeemedPence).toBe(platform - 500);
    expect(result.applicationFeePence).toBe(0);
    expect(sellerProceedsPence(result)).toBe(itemPence);
  });

  it("does not apply credit when applyCredit is false", () => {
    const result = computeCheckoutIncentives({
      itemPence: 10000,
      authenticityPence: 850,
      shippingPence: 949,
      referralDiscountPence: 0,
      availableCreditPence: 500,
      applyCredit: false,
    });
    expect(result.creditRedeemedPence).toBe(0);
    expect(sellerProceedsPence(result)).toBe(10000);
  });
});

describe("credit ledger balance", () => {
  it("sums available issues minus redemptions and ignores reversed rows", () => {
    const now = new Date("2026-08-17T12:00:00Z");
    const balance = creditBalanceFromRows(
      [
        { amount_pence: 500, status: "available" },
        { amount_pence: 500, status: "available" },
        { amount_pence: -500, status: "redeemed" },
        { amount_pence: 500, status: "reversed" },
        { amount_pence: 500, status: "pending" },
      ],
      now
    );
    expect(balance).toBe(500);
  });

  it("excludes expired available credit", () => {
    const now = new Date("2026-08-17T12:00:00Z");
    const balance = creditBalanceFromRows(
      [
        { amount_pence: 500, status: "available", expires_at: "2026-08-01T00:00:00Z" },
        { amount_pence: 300, status: "available", expires_at: "2026-09-01T00:00:00Z" },
      ],
      now
    );
    expect(balance).toBe(300);
  });
});

describe("creator milestone rewards", () => {
  const base = {
    creatorProgrammeEnabled: true,
    eventEnabled: true,
    amountPence: 200,
    creatorStatus: "active" as const,
    creatorUserId: "creator-user",
    referredUserId: "referred-user",
    alreadyHasReward: false,
  };

  it("awards when programme, event, active creator, and linked user are ok", () => {
    expect(decideCreatorMilestone(base)).toEqual({ ok: true, reason: "ok" });
  });

  it("supports independent event toggles", () => {
    expect(decideCreatorMilestone({ ...base, eventEnabled: false }).reason).toBe("event_disabled");
    expect(decideCreatorMilestone({ ...base, creatorProgrammeEnabled: false }).reason).toBe(
      "programme_disabled"
    );
    expect(decideCreatorMilestone({ ...base, amountPence: 0 }).reason).toBe("zero_amount");
  });

  it("blocks self-referral and missing/inactive creator account", () => {
    expect(
      decideCreatorMilestone({ ...base, referredUserId: "creator-user" }).reason
    ).toBe("self_referral");
    expect(decideCreatorMilestone({ ...base, creatorUserId: null }).reason).toBe(
      "missing_creator_user"
    );
    expect(decideCreatorMilestone({ ...base, creatorStatus: "paused" }).reason).toBe(
      "creator_inactive"
    );
  });

  it("is idempotent per referred user + reward type", () => {
    expect(decideCreatorMilestone({ ...base, alreadyHasReward: true }).reason).toBe(
      "already_awarded"
    );
    // Different users can each qualify once
    expect(
      decideCreatorMilestone({
        ...base,
        referredUserId: "user-b",
        alreadyHasReward: false,
      }).ok
    ).toBe(true);
    expect(
      decideCreatorMilestone({
        ...base,
        referredUserId: "user-c",
        alreadyHasReward: false,
      }).ok
    ).toBe(true);
  });

  it("simulates funnel: signup then listing then transaction once each", () => {
    const awarded = new Set<string>();
    const tryAward = (kind: string, referredUserId: string) => {
      const key = `${referredUserId}:${kind}`;
      const decision = decideCreatorMilestone({
        ...base,
        amountPence: kind === "listing" ? 1000 : kind === "transaction" ? 500 : 200,
        referredUserId,
        alreadyHasReward: awarded.has(key),
      });
      if (decision.ok) awarded.add(key);
      return decision;
    };

    expect(tryAward("new_user", "user-b").ok).toBe(true);
    expect(tryAward("new_user", "user-b").reason).toBe("already_awarded");
    expect(tryAward("listing", "user-b").ok).toBe(true);
    expect(tryAward("listing", "user-b").reason).toBe("already_awarded");
    expect(tryAward("transaction", "user-b").ok).toBe(true);
    expect(tryAward("transaction", "user-b").reason).toBe("already_awarded");
    expect(awarded.size).toBe(3);
  });

  it("maps milestone reward types to the credit ledger family", () => {
    expect(isCreatorMilestoneRewardType(ReferralRewardType.CREATOR_NEW_USER_REWARD)).toBe(true);
    expect(isCreatorMilestoneRewardType(ReferralRewardType.CREATOR_LISTING_REWARD)).toBe(true);
    expect(isCreatorMilestoneRewardType(ReferralRewardType.CREATOR_TRANSACTION_REWARD)).toBe(true);
    expect(isCreatorMilestoneRewardType(ReferralRewardType.CREATOR_COMMISSION)).toBe(false);
    expect(isCreatorMilestoneRewardType(ReferralRewardType.BUYER_REFERRER_CREDIT)).toBe(false);
  });

  it("defaults creator milestone settings to PRD example amounts", () => {
    expect(DEFAULT_REFERRAL_SETTINGS.creatorNewUserRewardPence).toBe(200);
    expect(DEFAULT_REFERRAL_SETTINGS.creatorListingRewardPence).toBe(1000);
    expect(DEFAULT_REFERRAL_SETTINGS.creatorTransactionRewardPence).toBe(500);
    expect(DEFAULT_REFERRAL_SETTINGS.creatorNewUserRewardEnabled).toBe(true);
    expect(DEFAULT_REFERRAL_SETTINGS.creatorMissionTitle).toBe("Bring more clubs onto Teevo");
    expect(DEFAULT_REFERRAL_SETTINGS.creatorMonthlyReferralTarget).toBe(10);
  });

  it("validates emails for creator user create/link", () => {
    expect(isValidEmail("creator@example.com")).toBe(true);
    expect(isValidEmail("not-an-email")).toBe(false);
  });
});
