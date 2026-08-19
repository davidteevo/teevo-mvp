import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { getAppUrl } from "@/lib/app-env";

export function shouldRotateStripeAccount(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("does not have access to account") ||
    message.includes("not connected to your platform") ||
    message.includes("account does not exist") ||
    message.includes("application access may have been revoked")
  );
}

type ProfileForStripe = {
  role?: string | null;
  first_name?: string | null;
  surname?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  address_city?: string | null;
  address_postcode?: string | null;
  address_country?: string | null;
  date_of_birth?: string | null;
};

export async function createExpressStripeAccount(
  stripe: Stripe,
  opts: { email?: string | null; profile?: ProfileForStripe | null }
): Promise<Stripe.Account> {
  const profile = opts.profile;
  const hasAddress =
    profile?.address_line1 &&
    profile?.address_city &&
    profile?.address_postcode &&
    profile?.address_country;
  const address = hasAddress
    ? {
        line1: profile.address_line1!,
        line2: profile.address_line2 || undefined,
        city: profile.address_city!,
        postal_code: profile.address_postcode!,
        country: profile.address_country!,
      }
    : undefined;

  let dob: { day: number; month: number; year: number } | undefined;
  if (profile?.date_of_birth) {
    const d = new Date(profile.date_of_birth);
    if (!Number.isNaN(d.getTime())) {
      dob = { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() };
    }
  }

  const hasName = profile?.first_name?.trim() || profile?.surname?.trim();
  const individual: {
    first_name?: string;
    last_name?: string;
    email?: string;
    address?: typeof address;
    dob?: typeof dob;
  } = {};
  if (profile?.first_name?.trim()) individual.first_name = profile.first_name.trim();
  if (profile?.surname?.trim()) individual.last_name = profile.surname.trim();
  if (address) individual.address = address;
  if (dob) individual.dob = dob;
  if (opts.email?.trim()) individual.email = opts.email.trim();

  const appUrl = getAppUrl();
  return stripe.accounts.create({
    type: "express",
    country: "GB",
    business_type: "individual",
    email: opts.email ?? undefined,
    business_profile: {
      product_description: "Selling pre-owned golf equipment as an individual on Teevo.",
      ...(appUrl ? { url: appUrl } : {}),
    },
    ...(hasName || address || dob || opts.email?.trim() ? { individual } : {}),
  });
}

export async function persistStripeAccountId(
  admin: SupabaseClient,
  userId: string,
  accountId: string,
  role?: string | null
): Promise<void> {
  await admin
    .from("users")
    .update({
      stripe_account_id: accountId,
      updated_at: new Date().toISOString(),
      ...(role !== "admin" ? { role: "seller" } : {}),
    })
    .eq("id", userId);
}

export async function clearStripeAccountId(admin: SupabaseClient, userId: string): Promise<void> {
  await admin
    .from("users")
    .update({ stripe_account_id: null, updated_at: new Date().toISOString() })
    .eq("id", userId);
}

/** Express dashboard login is only valid once payouts are enabled. */
export function isStripeOnboardingComplete(account: Stripe.Account): boolean {
  return account.payouts_enabled === true;
}

function isOnboardingIncompleteError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("has not completed onboarding") ||
    message.includes("not completed onboarding")
  );
}

function isStripeUnauthorizedFieldError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("not authorized to edit") ||
    message.includes("cannot edit") ||
    message.includes("you cannot change")
  );
}

/** Prefill seller email on the connected account for hosted onboarding/login. */
export async function syncStripeAccountEmail(
  stripe: Stripe,
  accountId: string,
  email?: string | null
): Promise<void> {
  const trimmed = email?.trim();
  if (!trimmed) return;
  const account = await stripe.accounts.retrieve(accountId);
  const updates: Stripe.AccountUpdateParams = {};
  if (account.email?.trim() !== trimmed) {
    updates.email = trimmed;
  }
  if (account.business_type === "individual") {
    updates.individual = { ...(updates.individual ?? {}), email: trimmed };
  }
  if (Object.keys(updates).length === 0) return;

  try {
    await stripe.accounts.update(accountId, updates);
  } catch (error) {
    if (!isStripeUnauthorizedFieldError(error)) throw error;
    // #region agent log
    fetch("http://127.0.0.1:7581/ingest/4c9de01a-e4bd-4cc4-acce-f5ab7832ce40", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "da8230" },
      body: JSON.stringify({
        sessionId: "da8230",
        runId: "post-fix-v2",
        hypothesisId: "H21",
        location: "lib/stripe-account.ts:syncStripeAccountEmail",
        message: "stripe_email_sync_skipped_not_authorized",
        data: { accountIdPrefix: accountId.slice(0, 8) },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }
}

async function createOnboardingLink(
  stripe: Stripe,
  accountId: string,
  opts: { returnUrl: string; refreshUrl: string }
): Promise<{ url: string; linkType: "account_onboarding" }> {
  const onboardingLink = await stripe.accountLinks.create({
    account: accountId,
    return_url: opts.returnUrl,
    refresh_url: opts.refreshUrl,
    type: "account_onboarding",
    collection_options: { fields: "eventually_due" },
  });
  return { url: onboardingLink.url, linkType: "account_onboarding" };
}

function stripeUrlKind(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.pathname.includes("/setup/")) return "setup";
    if (parsed.pathname.includes("/express/") || parsed.pathname.includes("/login")) {
      return "express_login";
    }
    return parsed.pathname.split("/").filter(Boolean).slice(0, 2).join("/") || "unknown";
  } catch {
    return "invalid";
  }
}

export async function resolveStripeAccountForOnboarding(
  stripe: Stripe,
  admin: SupabaseClient,
  opts: {
    userId: string;
    email?: string | null;
    profile?: ProfileForStripe | null;
    existingAccountId?: string | null;
  }
): Promise<{ accountId: string; strategy: "fresh" | "existing" }> {
  if (opts.existingAccountId) {
    try {
      const account = await stripe.accounts.retrieve(opts.existingAccountId);
      if (account.payouts_enabled) {
        return { accountId: account.id, strategy: "existing" };
      }
      await syncStripeAccountEmail(stripe, account.id, opts.email);
      return { accountId: account.id, strategy: "existing" };
    } catch (error) {
      if (!shouldRotateStripeAccount(error)) throw error;
    }
  }

  const account = await createExpressStripeAccount(stripe, {
    email: opts.email,
    profile: opts.profile,
  });
  await persistStripeAccountId(admin, opts.userId, account.id, opts.profile?.role);
  return { accountId: account.id, strategy: "fresh" };
}

export { stripeUrlKind };

/**
 * Login link for onboarded Express accounts; onboarding link otherwise.
 * Matches test behaviour where incomplete sellers complete hosted onboarding first.
 */
export async function createStripeConnectAccessUrl(
  stripe: Stripe,
  accountId: string,
  opts: { returnUrl: string; refreshUrl: string; email?: string | null }
): Promise<{ url: string; linkType: "login" | "account_onboarding" }> {
  await syncStripeAccountEmail(stripe, accountId, opts.email);
  const account = await stripe.accounts.retrieve(accountId);

  if (!isStripeOnboardingComplete(account)) {
    return createOnboardingLink(stripe, accountId, opts);
  }

  try {
    const loginLink = await stripe.accounts.createLoginLink(accountId);
    return { url: loginLink.url, linkType: "login" };
  } catch (error) {
    if (!isOnboardingIncompleteError(error)) throw error;
    return createOnboardingLink(stripe, accountId, opts);
  }
}

export async function ensurePlatformStripeAccount(
  stripe: Stripe,
  admin: SupabaseClient,
  opts: {
    userId: string;
    email?: string | null;
    profile?: ProfileForStripe | null;
    existingAccountId?: string | null;
  }
): Promise<string> {
  let accountId = opts.existingAccountId ?? null;

  if (accountId) {
    try {
      await stripe.accounts.retrieve(accountId);
    } catch (error) {
      if (!shouldRotateStripeAccount(error)) throw error;
      accountId = null;
    }
  }

  if (!accountId) {
    const account = await createExpressStripeAccount(stripe, {
      email: opts.email,
      profile: opts.profile,
    });
    accountId = account.id;
    await persistStripeAccountId(admin, opts.userId, accountId, opts.profile?.role);
  }

  return accountId;
}
