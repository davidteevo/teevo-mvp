/**
 * Milestone / urgency copy for the Founding Members campaign.
 * All values must derive from real claimed counts.
 */

export function founderProgressLabel(claimed: number, limit: number): string {
  const safeClaimed = Math.max(0, Math.min(claimed, limit));
  return `${safeClaimed} / ${limit} Founder spots claimed`;
}

export function founderRemainingLabel(claimed: number, limit: number): string {
  const remaining = Math.max(0, limit - claimed);
  if (remaining === 1) return "1 Founder spot remaining";
  return `${remaining} Founder spots remaining`;
}

export function founderMilestoneMessage(claimed: number, limit: number): string {
  if (claimed >= limit) return "The first 100 are in. 🎉";
  if (claimed >= 90) {
    const left = limit - claimed;
    return left === 1 ? "Only 1 Founder spot left." : `Only ${left} Founder spots left.`;
  }
  if (claimed >= 75) return "Founder spots are filling up.";
  if (claimed >= 50) return "We're halfway there.";
  return "Join Teevo's first 100.";
}

export function founderSocialProof(claimed: number): string | null {
  if (claimed < 1) return null;
  if (claimed === 1) return "Join 1 golfer already building Teevo.";
  return `Join ${claimed} golfers already building Teevo.`;
}
