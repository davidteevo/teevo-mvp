export type BuyerFeeSnapshot = {
  percentage: number;
  fixedPence: number;
  amountPence: number;
};

function parseMetaInt(value: string | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return null;
  return n;
}

function parseMetaPercentage(value: string | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return n;
}

/**
 * Read the fee snapshot written at Stripe session creation.
 * Missing all fields → null (legacy sessions). Partial/invalid → throw (do not reconstruct).
 */
export function parseBuyerFeeSnapshotFromMetadata(
  metadata: Record<string, string> | null | undefined
): BuyerFeeSnapshot | null {
  const percentageRaw = metadata?.buyerFeePercentage;
  const fixedRaw = metadata?.buyerFeeFixedPence;
  const amountRaw = metadata?.buyerFeeAmountPence;
  const present = [percentageRaw, fixedRaw, amountRaw].filter((v) => v != null && v !== "");
  if (present.length === 0) return null;
  if (present.length !== 3) {
    throw new Error("Incomplete Buyer Protection Fee snapshot on payment session.");
  }
  const percentage = parseMetaPercentage(percentageRaw);
  const fixedPence = parseMetaInt(fixedRaw);
  const amountPence = parseMetaInt(amountRaw);
  if (percentage == null || fixedPence == null || amountPence == null) {
    throw new Error("Invalid Buyer Protection Fee snapshot on payment session.");
  }
  return { percentage, fixedPence, amountPence };
}
