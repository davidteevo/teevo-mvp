/**
 * @deprecated Listing-time Founder rank assignment removed.
 * Founder numbers are allocated at account creation via allocateFoundingMemberIfEligible.
 * Kept as a no-op so any remaining imports do not break.
 */
export async function assignFoundingSellerRankIfEligible(
  _admin: unknown,
  _userId: string,
  _knownFoundingRank?: number | null
): Promise<void> {
  // no-op — see lib/founder/allocate.ts
}
