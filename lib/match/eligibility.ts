export type EligibilityInput = {
  category: string;
  subtype: string;
  head_version: string;
  head_eligible: boolean;
  conformity: string;
  head_key_count: number;
  shaft_key_count: number;
  shaft_eligibility: string;
  same_oem_variant: boolean;
  purchasable: boolean;
  handedness_matches: boolean;
  usable_loft: boolean;
  flex_mapping?: string;
  actual_weight_g?: number | null;
};

export function isMatchEligible(input: EligibilityInput): boolean {
  return (
    input.category === "DRIVER" &&
    input.subtype === "STANDARD" &&
    input.head_version === "DRIVER_V1" &&
    input.head_eligible === true &&
    input.conformity !== "NON_CONFORMING" &&
    input.head_key_count === 1 &&
    input.shaft_key_count === 1 &&
    input.shaft_eligibility === "MATCH_ELIGIBLE" &&
    input.same_oem_variant === true &&
    input.purchasable === true &&
    input.handedness_matches === true &&
    input.usable_loft === true
  );
}
