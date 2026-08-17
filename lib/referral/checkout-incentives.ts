/**
 * Pure checkout incentive math.
 * Referral discounts and Teevo credit are Teevo CAC — they never change itemPence.
 */

export type CheckoutIncentiveInput = {
  itemPence: number;
  authenticityPence: number;
  shippingPence: number;
  referralDiscountPence: number;
  availableCreditPence: number;
  applyCredit: boolean;
};

export type CheckoutIncentiveResult = {
  itemPence: number;
  authenticityPence: number;
  shippingPence: number;
  platformTakePence: number;
  referralDiscountAppliedPence: number;
  creditRedeemedPence: number;
  totalIncentivePence: number;
  applicationFeePence: number;
  buyerTotalPence: number;
};

export function computeCheckoutIncentives(input: CheckoutIncentiveInput): CheckoutIncentiveResult {
  const itemPence = Math.max(0, Math.round(input.itemPence));
  const authenticityPence = Math.max(0, Math.round(input.authenticityPence));
  const shippingPence = Math.max(0, Math.round(input.shippingPence));
  const platformTakePence = authenticityPence + shippingPence;

  const requestedDiscount = Math.max(0, Math.round(input.referralDiscountPence));
  const referralDiscountAppliedPence = Math.min(requestedDiscount, platformTakePence);

  const remainingCap = platformTakePence - referralDiscountAppliedPence;
  const requestedCredit =
    input.applyCredit && input.availableCreditPence > 0
      ? Math.max(0, Math.round(input.availableCreditPence))
      : 0;
  const creditRedeemedPence = Math.min(requestedCredit, remainingCap);

  const totalIncentivePence = referralDiscountAppliedPence + creditRedeemedPence;
  const applicationFeePence = platformTakePence - totalIncentivePence;
  const buyerTotalPence = itemPence + applicationFeePence;

  return {
    itemPence,
    authenticityPence,
    shippingPence,
    platformTakePence,
    referralDiscountAppliedPence,
    creditRedeemedPence,
    totalIncentivePence,
    applicationFeePence,
    buyerTotalPence,
  };
}

/** Invariant: seller destination proceeds equal the item price. */
export function sellerProceedsPence(result: CheckoutIncentiveResult): number {
  return result.buyerTotalPence - result.applicationFeePence;
}
