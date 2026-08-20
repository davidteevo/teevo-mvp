export type NewCustomerDiscountDecision = {
  eligible: boolean;
  reason:
    | "ok"
    | "programme_disabled"
    | "no_referral"
    | "existing_customer"
    | "below_minimum"
    | "self_referral";
};

export function decideNewCustomerDiscount(opts: {
  programmeEnabled: boolean;
  hasReferral: boolean;
  isSelfReferral: boolean;
  priorNonRefundedBuyerPurchases: number;
  itemPence: number;
  minItemPence: number;
}): NewCustomerDiscountDecision {
  if (!opts.programmeEnabled) return { eligible: false, reason: "programme_disabled" };
  if (opts.isSelfReferral) return { eligible: false, reason: "self_referral" };
  if (!opts.hasReferral) return { eligible: false, reason: "no_referral" };
  if (opts.priorNonRefundedBuyerPurchases > 0) return { eligible: false, reason: "existing_customer" };
  if (opts.itemPence < opts.minItemPence) return { eligible: false, reason: "below_minimum" };
  return { eligible: true, reason: "ok" };
}

export type AttributionDecision = {
  accept: boolean;
  reason:
    | "ok"
    | "already_attributed"
    | "self_referral"
    | "code_disabled"
    | "code_missing_owner"
    | "creator_inactive"
    | "programme_disabled";
};

export function decideAttribution(opts: {
  alreadyAttributed: boolean;
  actorUserId: string;
  codeOwnerUserId: string | null;
  codeStatus: "active" | "disabled";
  codeKind: "user" | "creator";
  creatorStatus: "active" | "paused" | "disabled" | null;
  programmeEnabled: boolean;
  sellerEnabled?: boolean;
  creatorProgrammeEnabled: boolean;
}): AttributionDecision {
  if (opts.alreadyAttributed) return { accept: false, reason: "already_attributed" };
  if (!opts.codeOwnerUserId) return { accept: false, reason: "code_missing_owner" };
  if (opts.codeOwnerUserId === opts.actorUserId) return { accept: false, reason: "self_referral" };
  if (opts.codeStatus !== "active") return { accept: false, reason: "code_disabled" };
  if (opts.codeKind === "creator") {
    if (!opts.creatorProgrammeEnabled) return { accept: false, reason: "programme_disabled" };
    if (opts.creatorStatus !== "active") return { accept: false, reason: "creator_inactive" };
    return { accept: true, reason: "ok" };
  }
  if (!opts.programmeEnabled && !opts.sellerEnabled) {
    return { accept: false, reason: "programme_disabled" };
  }
  return { accept: true, reason: "ok" };
}

export function attributionSource(opts: {
  kind: "user" | "creator";
  via: "url" | "code";
}): "url" | "code" | "creator_url" | "creator_code" {
  if (opts.kind === "creator") return opts.via === "url" ? "creator_url" : "creator_code";
  return opts.via;
}

/** Whether a referral should earn Supply (listing) rewards. */
export function isSupplyReferral(
  referral: { reward_priority?: string | null },
  settings: { sellerEnabled: boolean }
): boolean {
  if (referral.reward_priority === "supply") return true;
  if (referral.reward_priority === "demand") return false;
  return settings.sellerEnabled;
}

/** Whether a referral should earn Demand (purchase) rewards / discount. */
export function isDemandReferral(
  referral: { reward_priority?: string | null },
  settings: { programmeEnabled: boolean }
): boolean {
  if (referral.reward_priority === "demand") return true;
  if (referral.reward_priority === "supply") return false;
  return settings.programmeEnabled;
}
