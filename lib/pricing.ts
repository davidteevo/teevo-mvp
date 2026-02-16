/**
 * Teevo pricing: authenticity & protection fee (Vinted-style) and shipping.
 * All amounts in pence.
 */

export const AUTHENTICITY_FEE_RATE = 0.08;
export const AUTHENTICITY_FEE_FIXED_PENCE = 50;
export const SHIPPING_PENCE = 949; // £9.49

export function calcAuthenticityFeePence(itemPricePence: number): number {
  return Math.round(itemPricePence * AUTHENTICITY_FEE_RATE + AUTHENTICITY_FEE_FIXED_PENCE);
}

export function calcOrderBreakdown(itemPricePence: number): {
  itemPence: number;
  authenticityPence: number;
  shippingPence: number;
  totalPence: number;
} {
  const authenticityPence = calcAuthenticityFeePence(itemPricePence);
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
