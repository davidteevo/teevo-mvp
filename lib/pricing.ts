/**
 * Teevo pricing: authenticity & protection fee (Vinted-style) and shipping.
 * All amounts in pence. Fee rates come from platform settings, not constants.
 */

export const SHIPPING_PENCE = 949; // £9.49

export type BuyerFeeConfig = {
  /** Display percentage, e.g. 8 for 8%. */
  percentage: number;
  /** Percentage × 100, e.g. 8.00% → 800. */
  percentageHundredths: number;
  fixedPence: number;
};

export function calcAuthenticityFeePence(itemPricePence: number, fees: BuyerFeeConfig): number {
  return Math.round((itemPricePence * fees.percentageHundredths) / 10000) + fees.fixedPence;
}

export function calcOrderBreakdown(
  itemPricePence: number,
  fees: BuyerFeeConfig
): {
  itemPence: number;
  authenticityPence: number;
  shippingPence: number;
  totalPence: number;
} {
  const authenticityPence = calcAuthenticityFeePence(itemPricePence, fees);
  return {
    itemPence: itemPricePence,
    authenticityPence,
    shippingPence: SHIPPING_PENCE,
    totalPence: itemPricePence + authenticityPence + SHIPPING_PENCE,
  };
}

export function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

/** Whole pounds as £5; otherwise two decimals. For marketing copy. */
export function formatPoundsCompact(pence: number): string {
  const pounds = pence / 100;
  if (Number.isInteger(pounds)) return `£${pounds}`;
  return formatPence(pence);
}
