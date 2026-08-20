import { Suspense } from "react";
import Link from "next/link";
import { ListingGrid } from "@/components/listing/ListingGrid";
import { ListingCard } from "@/components/listing/ListingCard";
import { SmartSearchHero } from "@/components/listing/SmartSearchHero";
import { HomeFilterBar } from "@/components/listing/HomeFilterBar";
import { ActiveFilterChips } from "@/components/listing/ActiveFilterChips";
import {
  FounderBenefits,
  FounderCampaignCompleteNote,
  FounderHero,
  FounderHowItWorks,
  FounderStickyCta,
} from "@/components/founder/FounderHome";
import { getFilterBrands } from "@/lib/filter-brands";
import { createAdminClient } from "@/lib/supabase/admin";
import { isBuyingEnabled } from "@/lib/buying";
import { getFounderCampaignSnapshot, isFounderCampaignActive } from "@/lib/founder/campaign";
import {
  founderMilestoneMessage,
  founderProgressLabel,
  founderRemainingLabel,
  founderSocialProof,
} from "@/lib/founder/copy";
import { getPublicListings } from "@/lib/listings";
import { cookies } from "next/headers";
import { REF_COOKIE } from "@/lib/referral/attribution";
import { lookupReferralCode, normalizeReferralCode } from "@/lib/referral/codes";
import type { Listing } from "@/types/database";

export const dynamic = "force-dynamic";

export type SearchParams = {
  category?: string;
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
  search?: string;
  shaft?: string;
  shaftFlex?: string;
  degree?: string;
  degreeMin?: string;
  handed?: string;
  item_type?: string;
  size?: string;
  condition?: string;
  sort?: string;
};

function FilterBarFallback() {
  return (
    <div className="mb-4 h-14 animate-pulse rounded-full bg-mowing-green/10" aria-hidden />
  );
}

async function resolveReferrerFirstName(): Promise<string | null> {
  try {
    const jar = await cookies();
    const raw = jar.get(REF_COOKIE)?.value ?? "";
    const code = normalizeReferralCode(raw);
    if (!code) return null;
    const admin = createAdminClient();
    const row = await lookupReferralCode(admin, code);
    if (!row?.owner_user_id || row.status !== "active") return null;
    const { data: owner } = await admin
      .from("users")
      .select("first_name")
      .eq("id", row.owner_user_id)
      .maybeSingle();
    const name = typeof owner?.first_name === "string" ? owner.first_name.trim() : "";
    return name && name.length <= 40 ? name : null;
  } catch {
    return null;
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const brandSuggestions = getFilterBrands();
  const admin = createAdminClient();
  const [buyingEnabled, campaign, referrerFirstName, previewListings] = await Promise.all([
    isBuyingEnabled(admin),
    getFounderCampaignSnapshot(admin),
    resolveReferrerFirstName(),
    getPublicListings({}).then((rows) => (rows as Listing[]).slice(0, 4)).catch(() => [] as Listing[]),
  ]);

  const founderActive = isFounderCampaignActive(campaign);
  const showCompleteNote = campaign.status === "complete" || campaign.claimed >= campaign.limit;

  return (
    <div className="max-w-6xl mx-auto min-w-0 w-full px-4 py-8 overflow-x-clip">
      {!buyingEnabled && (
        <div className="mb-4 rounded-xl bg-mowing-green/10 border border-mowing-green/20 px-4 py-3 text-center text-sm text-mowing-green/90">
          Teevo is launching soon. Sellers can list gear today. Buying opens shortly.
        </div>
      )}

      {founderActive ? (
        <>
          <FounderHero
            claimed={campaign.claimed}
            remaining={campaign.remaining}
            limit={campaign.limit}
            progressLabel={founderProgressLabel(campaign.claimed, campaign.limit)}
            remainingLabel={founderRemainingLabel(campaign.claimed, campaign.limit)}
            milestoneMessage={founderMilestoneMessage(campaign.claimed, campaign.limit)}
            socialProof={founderSocialProof(campaign.claimed)}
            referrerFirstName={referrerFirstName}
          />
          <FounderStickyCta claimed={campaign.claimed} remaining={campaign.remaining} />
          <FounderBenefits />
          <FounderHowItWorks />
          {previewListings.length > 0 && (
            <section className="mb-10" aria-labelledby="clubs-now-heading">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h2 id="clubs-now-heading" className="text-xl font-bold text-mowing-green">
                  Clubs on Teevo right now
                </h2>
                <Link href="/#browse" className="text-sm font-medium text-mowing-green underline-offset-2 hover:underline">
                  Browse all clubs →
                </Link>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {previewListings.map((listing, i) => (
                  <ListingCard key={listing.id} listing={listing} priority={i < 2} />
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <>
          {showCompleteNote && <FounderCampaignCompleteNote />}
          <header className="mb-8 rounded-2xl bg-mowing-green/5 border border-mowing-green/10 px-6 py-8 sm:px-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-mowing-green">
              Golf equipment for every game
            </h1>
            <p className="mt-2 text-mowing-green/80">
              Browse verified listings from UK sellers. Secure payment, no fuss.
            </p>
            <SmartSearchHero />
          </header>
        </>
      )}

      {founderActive && (
        <div id="browse" className="mb-6 scroll-mt-24">
          <h2 className="text-xl font-bold text-mowing-green">Browse the marketplace</h2>
          <p className="mt-1 text-sm text-mowing-green/75">Search and filter clubs — no account needed.</p>
          <div className="mt-4">
            <SmartSearchHero />
          </div>
        </div>
      )}

      <Suspense fallback={<FilterBarFallback />}>
        <HomeFilterBar brandSuggestions={brandSuggestions} />
      </Suspense>

      <Suspense fallback={null}>
        <ActiveFilterChips />
      </Suspense>

      <ListingGrid searchParams={searchParams} />
    </div>
  );
}
