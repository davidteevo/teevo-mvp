import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { generateDisplayNameFromFirstName } from "@/lib/public-seller-name";
import { getAppUrl } from "@/lib/app-env";
import { addWatchlistItem, parseWatchListingId, stripWatchParam } from "@/lib/watchlist";
import { trackServerEvent } from "@/lib/starter-pack";
import { provisionNewUserReferral, REF_COOKIE } from "@/lib/referral/attribution";
import { allocateFoundingMemberIfEligible } from "@/lib/founder/allocate";
import { getFounderCampaignSnapshot } from "@/lib/founder/campaign";
import { assertStripeModeMatchesEnv } from "@/lib/stripe-env";
import { ensureUserEmailConfirmedAt } from "@/lib/user-email-confirmed";

assertStripeModeMatchesEnv();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next") ?? "/dashboard";
  const code = searchParams.get("code");
  let isNewUser = false;
  let founderRank: number | null = null;
  let founderMissed = false;
  let sessionUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null = null;
  if (code) {
    const supabase = await createClient();
    const { data: { user }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      const base = getAppUrl() || new URL(request.url).origin;
      const isResetPassword = next === "/login/reset-password" || next.startsWith("/login/reset-password");
      const redirectPath = isResetPassword
        ? `${base}/login/reset-password?error=invalid_link&error_description=${encodeURIComponent(
            `${exchangeError.message}. For password reset, open the email link in the same browser where you clicked Forgot password (PKCE).`
          )}`
        : new URL(next, request.url).toString();
      return NextResponse.redirect(redirectPath);
    }
    sessionUser = user;
    if (user) {
      const admin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: existing } = await admin.from("users").select("id").eq("id", user.id).single();
      const updated_at = new Date().toISOString();
      if (existing) {
        await admin.from("users").update({ email: user.email ?? "", updated_at }).eq("id", user.id);
        await ensureUserEmailConfirmedAt(admin, user.id, user.email_confirmed_at ?? null);
      } else {
        isNewUser = true;
        let stripe_account_id: string | null = null;
        try {
          const appUrl = getAppUrl();
          const account = await stripe.accounts.create({
            type: "express",
            country: "GB",
            business_type: "individual",
            email: user.email ?? undefined,
            business_profile: {
              product_description: "Selling pre-owned golf equipment as an individual on Teevo.",
              ...(appUrl ? { url: appUrl } : {}),
            },
          });
          stripe_account_id = account.id;
        } catch {
          // Create on first Connect click if Stripe fails here (e.g. rate limit)
        }
        const first_name =
          (user.user_metadata?.first_name as string)?.trim() || null;
        await admin.from("users").insert({
          id: user.id,
          email: user.email ?? "",
          role: "seller",
          stripe_account_id,
          first_name,
          display_name: generateDisplayNameFromFirstName(first_name),
          email_confirmed_at: user.email_confirmed_at ?? null,
          updated_at,
        });
        await ensureUserEmailConfirmedAt(admin, user.id, user.email_confirmed_at ?? null);
        const cookieHeader = request.headers.get("cookie") ?? "";
        const cookieMatch = cookieHeader.match(new RegExp(`(?:^|;\\s*)${REF_COOKIE}=([^;]*)`));
        const refFromCookie = cookieMatch ? decodeURIComponent(cookieMatch[1]) : "";
        const refFromQuery = searchParams.get("ref") ?? "";
        const refFromMeta =
          typeof user.user_metadata?.referral_code === "string" ? user.user_metadata.referral_code : "";
        const rawCode = refFromCookie || refFromQuery || refFromMeta;
        const via = refFromCookie || refFromQuery ? "url" : "code";
        await provisionNewUserReferral(admin, {
          userId: user.id,
          firstName: first_name,
          email: user.email,
          rawCode: rawCode || null,
          via,
        });
        const campaignBefore = await getFounderCampaignSnapshot(admin);
        founderRank = await allocateFoundingMemberIfEligible(admin, user.id);
        if (
          founderRank == null &&
          campaignBefore.status === "active" &&
          campaignBefore.remaining > 0
        ) {
          const campaignAfter = await getFounderCampaignSnapshot(admin);
          if (campaignAfter.claimed >= campaignAfter.limit) {
            founderMissed = true;
          }
        }
      }
    }
  }
  const watchListingId = parseWatchListingId(next);
  if (watchListingId && sessionUser) {
    try {
      const admin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      await addWatchlistItem(admin, sessionUser.id, watchListingId);
      if (isNewUser) {
        await trackServerEvent(admin, "watchlist_account_created", {
          userId: sessionUser.id,
          properties: { listing_id: watchListingId },
        });
      }
    } catch (e) {
      console.error("watchlist intent after auth failed", e);
    }
  }

  const redirectPath = watchListingId
    ? stripWatchParam(next) || `/listing/${watchListingId}`
    : isNewUser && next === "/sell/start"
      ? "/sell/start"
      : isNewUser && founderRank != null
        ? `/onboarding/founder?rank=${founderRank}`
        : isNewUser && founderMissed
          ? "/onboarding/welcome?new=1&founder_missed=1"
          : isNewUser
            ? "/onboarding/welcome?new=1"
            : next;
  return NextResponse.redirect(new URL(redirectPath, request.url));
}
